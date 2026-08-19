import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type {
  OfflineAuthorizationSnapshot,
  OfflineQueueSummary,
  OfflineSaleEnvelope,
  PendingOfflineSale,
} from "./types";

const DATABASE_NAME = "drx-offline.db";
const DATABASE_KEY_NAME = "drx.offline.database-key.v1";
const DATABASE_VERSION = 2;

export type CachedProduct = {
  _id: string;
  productName: string;
  sku: string;
  sellingPriceCents: number;
  quantityOnHandGrams: number;
  [key: string]: unknown;
};

export type CachedCustomer = {
  _id: string;
  firstName?: string;
  lastName?: string;
  creditLimitCents: number;
  totalCreditUsedCents: number;
  [key: string]: unknown;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createHexKey() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getDatabaseKey() {
  const existing = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const next = createHexKey();
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, next, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return next;
}

async function openDatabase() {
  const key = await getDatabaseKey();
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(`PRAGMA key = "x'${key}'"`);
  const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = versionRow?.user_version ?? 0;
  if (version < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS offline_authorizations (
        authorization_id TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        issued_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS offline_authorizations_scope
        ON offline_authorizations (business_id, user_id, expires_at);
      CREATE TABLE IF NOT EXISTS offline_sales (
        idempotency_key TEXT PRIMARY KEY NOT NULL,
        authorization_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        occurred_at INTEGER NOT NULL,
        total_amount_cents INTEGER NOT NULL,
        envelope_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'acknowledged', 'quarantined')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error_code TEXT,
        server_sale_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS offline_sales_scope_status
        ON offline_sales (business_id, user_id, status, sequence);
      CREATE TABLE IF NOT EXISTS offline_receipts (
        idempotency_key TEXT PRIMARY KEY NOT NULL,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        server_sale_id TEXT NOT NULL,
        total_amount_cents INTEGER NOT NULL,
        acknowledged_at INTEGER NOT NULL,
        purge_after INTEGER NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  }
  if (version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_products (
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (business_id, user_id, product_id)
      );
      CREATE TABLE IF NOT EXISTS cached_customers (
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (business_id, user_id, customer_id)
      );
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
  }
  return db;
}

export function getOfflineDatabase() {
  databasePromise ??= openDatabase();
  return databasePromise;
}

export async function saveAuthorization(snapshot: OfflineAuthorizationSnapshot) {
  const db = await getOfflineDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_authorizations
      (authorization_id, business_id, user_id, device_id, snapshot_json, issued_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    snapshot.authorizationId,
    snapshot.businessId,
    snapshot.userId,
    snapshot.deviceId,
    JSON.stringify(snapshot),
    snapshot.issuedAt,
    snapshot.expiresAt,
    Date.now(),
  );
}

export async function getActiveAuthorization(businessId: string, userId: string) {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{ snapshot_json: string }>(
    `SELECT snapshot_json FROM offline_authorizations
     WHERE business_id = ? AND user_id = ? AND expires_at >= ?
     ORDER BY expires_at DESC LIMIT 1`,
    businessId,
    userId,
    Date.now(),
  );
  return row ? (JSON.parse(row.snapshot_json) as OfflineAuthorizationSnapshot) : null;
}

export async function enqueueOfflineSale(
  authorization: OfflineAuthorizationSnapshot,
  envelope: OfflineSaleEnvelope,
) {
  if (authorization.authorizationId !== envelope.authorizationId) {
    throw new Error("OFFLINE_AUTHORIZATION_MISMATCH");
  }
  if (authorization.businessId !== envelope.businessId || authorization.userId !== envelope.userId) {
    throw new Error("OFFLINE_SCOPE_MISMATCH");
  }
  if (envelope.occurredAt < authorization.issuedAt || envelope.occurredAt > authorization.expiresAt) {
    throw new Error("OFFLINE_AUTHORIZATION_EXPIRED");
  }
  if (envelope.totalAmountCents > authorization.perSaleLimitCents) {
    throw new Error("OFFLINE_PER_SALE_LIMIT");
  }
  if (
    envelope.paymentMethod === "credit" &&
    envelope.totalAmountCents > authorization.offlineCreditLimitCents
  ) {
    throw new Error("OFFLINE_CREDIT_LIMIT");
  }
  if (
    envelope.paymentMethod === "cash" &&
    envelope.amountPaidCents < envelope.totalAmountCents
  ) {
    throw new Error("OFFLINE_CASH_UNDERPAID");
  }
  if (envelope.paymentMethod === "credit" && envelope.amountPaidCents !== 0) {
    throw new Error("OFFLINE_CREDIT_AMOUNT_PAID_MUST_BE_ZERO");
  }

  const db = await getOfflineDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `DELETE FROM offline_sales
       WHERE status = 'acknowledged'
         AND authorization_id IN (
           SELECT authorization_id FROM offline_authorizations WHERE expires_at < ?
         )`,
      Date.now(),
    );
    const aggregate = await transaction.getFirstAsync<{ count: number; total: number }>(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount_cents), 0) AS total
       FROM offline_sales
       WHERE authorization_id = ? AND status IN ('pending', 'syncing', 'acknowledged')`,
      authorization.authorizationId,
    );
    if ((aggregate?.count ?? 0) >= authorization.maxQueuedSales) {
      throw new Error("OFFLINE_QUEUE_LIMIT");
    }
    if ((aggregate?.total ?? 0) + envelope.totalAmountCents > authorization.sessionLimitCents) {
      throw new Error("OFFLINE_SESSION_LIMIT");
    }
    const now = Date.now();
    await transaction.runAsync(
      `INSERT INTO offline_sales
        (idempotency_key, authorization_id, business_id, user_id, device_id, sequence,
         occurred_at, total_amount_cents, envelope_json, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      envelope.idempotencyKey,
      envelope.authorizationId,
      envelope.businessId,
      envelope.userId,
      envelope.deviceId,
      envelope.sequence,
      envelope.occurredAt,
      envelope.totalAmountCents,
      JSON.stringify(envelope),
      now,
      now,
    );
  });
}

export async function listPendingSales(businessId: string, userId: string) {
  const db = await getOfflineDatabase();
  const rows = await db.getAllAsync<{
    idempotency_key: string;
    envelope_json: string;
    attempts: number;
    status: PendingOfflineSale["status"];
  }>(
    `SELECT idempotency_key, envelope_json, attempts, status FROM offline_sales
     WHERE business_id = ? AND user_id = ? AND status IN ('pending', 'syncing')
     ORDER BY sequence ASC`,
    businessId,
    userId,
  );
  return rows.map((row) => ({
    idempotencyKey: row.idempotency_key,
    envelope: JSON.parse(row.envelope_json) as OfflineSaleEnvelope,
    attempts: row.attempts,
    status: row.status,
  }));
}

export async function markSyncing(idempotencyKey: string) {
  const db = await getOfflineDatabase();
  await db.runAsync(
    `UPDATE offline_sales SET status = 'syncing', attempts = attempts + 1, updated_at = ?
     WHERE idempotency_key = ? AND status IN ('pending', 'syncing')`,
    Date.now(),
    idempotencyKey,
  );
}

export async function markSyncFailure(idempotencyKey: string, errorCode: string) {
  const db = await getOfflineDatabase();
  await db.runAsync(
    `UPDATE offline_sales SET status = 'pending', last_error_code = ?, updated_at = ?
     WHERE idempotency_key = ? AND status = 'syncing'`,
    errorCode.slice(0, 80),
    Date.now(),
    idempotencyKey,
  );
}

export async function markSyncResult(
  idempotencyKey: string,
  result: { status: "committed" | "duplicate" | "quarantined"; saleId: string | null },
) {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<{
    business_id: string;
    user_id: string;
    total_amount_cents: number;
  }>(
    `SELECT business_id, user_id, total_amount_cents FROM offline_sales WHERE idempotency_key = ?`,
    idempotencyKey,
  );
  if (!row) return;
  if (result.status === "quarantined") {
    await db.runAsync(
      `UPDATE offline_sales SET status = 'quarantined', last_error_code = 'SERVER_QUARANTINED', updated_at = ?
       WHERE idempotency_key = ?`,
      Date.now(),
      idempotencyKey,
    );
    return;
  }
  if (!result.saleId) throw new Error("OFFLINE_SYNC_MISSING_SALE_ID");
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const now = Date.now();
    await transaction.runAsync(
      `INSERT OR REPLACE INTO offline_receipts
        (idempotency_key, business_id, user_id, server_sale_id, total_amount_cents,
         acknowledged_at, purge_after) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      idempotencyKey,
      row.business_id,
      row.user_id,
      result.saleId,
      row.total_amount_cents,
      now,
      now + 7 * 24 * 60 * 60 * 1000,
    );
    await transaction.runAsync(
      `UPDATE offline_sales
       SET status = 'acknowledged', server_sale_id = ?, last_error_code = NULL, updated_at = ?
       WHERE idempotency_key = ?`,
      result.saleId,
      now,
      idempotencyKey,
    );
    await transaction.runAsync("DELETE FROM offline_receipts WHERE purge_after < ?", now);
  });
}

export async function saveCachedCatalog(
  businessId: string,
  userId: string,
  products: CachedProduct[],
  customers: CachedCustomer[],
) {
  const db = await getOfflineDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const now = Date.now();
    await transaction.runAsync(
      "DELETE FROM cached_products WHERE business_id = ? AND user_id = ?",
      businessId,
      userId,
    );
    await transaction.runAsync(
      "DELETE FROM cached_customers WHERE business_id = ? AND user_id = ?",
      businessId,
      userId,
    );
    for (const product of products) {
      await transaction.runAsync(
        `INSERT INTO cached_products
          (business_id, user_id, product_id, snapshot_json, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        businessId,
        userId,
        product._id,
        JSON.stringify(product),
        now,
      );
    }
    for (const customer of customers) {
      await transaction.runAsync(
        `INSERT INTO cached_customers
          (business_id, user_id, customer_id, snapshot_json, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        businessId,
        userId,
        customer._id,
        JSON.stringify(customer),
        now,
      );
    }
  });
}

export async function getCachedCatalog(businessId: string, userId: string) {
  const db = await getOfflineDatabase();
  const [productRows, customerRows] = await Promise.all([
    db.getAllAsync<{ snapshot_json: string }>(
      `SELECT snapshot_json FROM cached_products
       WHERE business_id = ? AND user_id = ? ORDER BY product_id`,
      businessId,
      userId,
    ),
    db.getAllAsync<{ snapshot_json: string }>(
      `SELECT snapshot_json FROM cached_customers
       WHERE business_id = ? AND user_id = ? ORDER BY customer_id`,
      businessId,
      userId,
    ),
  ]);
  return {
    products: productRows.map((row) => JSON.parse(row.snapshot_json) as CachedProduct),
    customers: customerRows.map((row) => JSON.parse(row.snapshot_json) as CachedCustomer),
  };
}

export async function getQueueSummary(businessId: string, userId: string) {
  const db = await getOfflineDatabase();
  const row = await db.getFirstAsync<OfflineQueueSummary>(
    `SELECT
       SUM(CASE WHEN status IN ('pending', 'syncing') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'quarantined' THEN 1 ELSE 0 END) AS quarantined,
       COALESCE(SUM(CASE WHEN status IN ('pending', 'syncing') THEN total_amount_cents ELSE 0 END), 0) AS totalCents
     FROM offline_sales WHERE business_id = ? AND user_id = ?`,
    businessId,
    userId,
  );
  return {
    pending: Number(row?.pending ?? 0),
    quarantined: Number(row?.quarantined ?? 0),
    totalCents: Number(row?.totalCents ?? 0),
  };
}
