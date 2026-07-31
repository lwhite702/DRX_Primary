#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = path.resolve(process.cwd(), "db/migrations");
const db = new PGlite();

async function migrationSql(file) {
  return fs.readFile(path.join(migrationsDir, file), "utf8");
}

async function exists(kind, name) {
  const queries = {
    table: "SELECT to_regclass($1) IS NOT NULL AS present",
    index: "SELECT to_regclass($1) IS NOT NULL AS present",
    function:
      "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = $1) AS present",
    constraint:
      "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS present",
  };
  const result = await db.query(queries[kind], [name]);
  return result.rows[0].present;
}

async function apply(file) {
  await db.exec(await migrationSql(file));
}

try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID
      LANGUAGE sql STABLE
      AS $$ SELECT '00000000-0000-0000-0000-000000000001'::UUID $$;
    CREATE FUNCTION has_business_access(UUID, UUID) RETURNS BOOLEAN
      LANGUAGE sql STABLE AS $$ SELECT true $$;
    CREATE FUNCTION is_admin(UUID) RETURNS BOOLEAN
      LANGUAGE sql STABLE AS $$ SELECT false $$;

    CREATE TABLE business_profile (id UUID PRIMARY KEY);
    CREATE TABLE customers (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL REFERENCES business_profile(id),
      phone_hash TEXT,
      email_hash TEXT,
      alias_hash TEXT
    );
    CREATE TABLE credit_limits (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      customer_id UUID NOT NULL
    );
    CREATE TABLE inventory (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      quantity_on_hand NUMERIC(16, 4),
      unit_cost NUMERIC(12, 6),
      updated_at TIMESTAMPTZ
    );
    CREATE TABLE inventory_batches (
      id UUID PRIMARY KEY,
      business_id UUID NOT NULL,
      inventory_id UUID NOT NULL,
      intake_id UUID,
      original_quantity_grams NUMERIC(12, 4),
      remaining_quantity_grams NUMERIC(12, 4),
      unit_cost_per_gram NUMERIC(12, 6),
      supplier VARCHAR(255),
      received_at TIMESTAMP,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE sales_line_item_allocations (
      id UUID PRIMARY KEY,
      batch_id UUID REFERENCES inventory_batches(id)
    );
    CREATE TABLE business_settings (
      business_id UUID PRIMARY KEY,
      transaction_count INTEGER,
      random_inventory_check_frequency INTEGER,
      updated_at TIMESTAMPTZ
    );
    CREATE TABLE cost_history (
      business_id UUID,
      inventory_id UUID,
      intake_id UUID,
      cost_per_gram NUMERIC,
      total_cost NUMERIC,
      total_weight_grams NUMERIC,
      delivery_cost NUMERIC,
      supplier VARCHAR(255)
    );
    CREATE TABLE inventory_log (
      inventory_id UUID,
      transaction_type TEXT,
      quantity_change NUMERIC,
      reason TEXT,
      created_by UUID,
      metadata JSONB
    );
  `);

  await apply("20260523000000_privacy_native_customer_identity.sql");
  assert.equal(await exists("table", "privacy_profiles"), true);
  assert.equal(
    await exists("constraint", "uq_credit_limits_business_customer"),
    true,
  );
  await apply("20260523000000_privacy_native_customer_identity.down.sql");
  assert.equal(await exists("table", "privacy_profiles"), false);
  assert.equal(
    await exists("constraint", "uq_credit_limits_business_customer"),
    false,
  );

  await apply("20260523000001_inventory_batch_safety.sql");
  assert.equal(
    await exists("function", "ensure_inventory_batch_for_intake"),
    true,
  );
  assert.equal(
    await exists("index", "idx_inventory_batches_business_intake_lookup"),
    true,
  );
  await apply("20260523000001_inventory_batch_safety.down.sql");
  assert.equal(
    await exists("function", "ensure_inventory_batch_for_intake"),
    false,
  );
  assert.equal(
    await exists("index", "idx_inventory_batches_business_intake_lookup"),
    false,
  );

  await apply("20260523000002_random_check_counter_atomic.sql");
  let counterSource = await db.query(
    "SELECT prosrc FROM pg_proc WHERE proname = 'increment_transaction_counter'",
  );
  assert.match(counterSource.rows[0].prosrc, /ON CONFLICT/);
  await apply("20260523000002_random_check_counter_atomic.down.sql");
  counterSource = await db.query(
    "SELECT prosrc FROM pg_proc WHERE proname = 'increment_transaction_counter'",
  );
  assert.doesNotMatch(counterSource.rows[0].prosrc, /ON CONFLICT/);
  assert.match(
    counterSource.rows[0].prosrc,
    /v_current_count := v_current_count \+ 1/,
  );

  await apply("20260524000001_apply_inventory_intake_mutation.sql");
  assert.equal(
    await exists("function", "apply_inventory_intake_mutation"),
    true,
  );
  await apply("20260524000001_apply_inventory_intake_mutation.down.sql");
  assert.equal(
    await exists("function", "apply_inventory_intake_mutation"),
    false,
  );

  const businessId = "10000000-0000-0000-0000-000000000001";
  const inventoryId = "20000000-0000-0000-0000-000000000001";
  const intakeId = "30000000-0000-0000-0000-000000000001";
  const keeperId = "40000000-0000-0000-0000-000000000001";
  const duplicateId = "40000000-0000-0000-0000-000000000002";
  const allocationId = "50000000-0000-0000-0000-000000000001";

  await db.query(
    `INSERT INTO inventory_batches
     (id, business_id, inventory_id, intake_id, created_at)
     VALUES
     ($1, $2, $3, $4, '2026-01-01T00:00:00Z'),
     ($5, $2, $3, $4, '2026-01-02T00:00:00Z')`,
    [keeperId, businessId, inventoryId, intakeId, duplicateId],
  );
  await db.query(
    "INSERT INTO sales_line_item_allocations (id, batch_id) VALUES ($1, $2)",
    [allocationId, duplicateId],
  );
  await apply("20260524000002_inventory_batches_unique_intake.sql");
  assert.equal(
    await exists("index", "idx_inventory_batches_business_intake_unique"),
    true,
  );
  const allocation = await db.query(
    "SELECT batch_id FROM sales_line_item_allocations WHERE id = $1",
    [allocationId],
  );
  assert.equal(allocation.rows[0].batch_id, keeperId);
  const batches = await db.query(
    "SELECT id FROM inventory_batches WHERE business_id = $1 AND intake_id = $2",
    [businessId, intakeId],
  );
  assert.deepEqual(
    batches.rows.map((row) => row.id),
    [keeperId],
  );
  await apply("20260524000002_inventory_batches_unique_intake.down.sql");
  assert.equal(
    await exists("index", "idx_inventory_batches_business_intake_unique"),
    false,
  );
  const remainingBatches = await db.query(
    "SELECT COUNT(*)::INTEGER AS count FROM inventory_batches WHERE business_id = $1 AND intake_id = $2",
    [businessId, intakeId],
  );
  assert.equal(remainingBatches.rows[0].count, 1);

  console.log(
    "[migration-rollbacks] PostgreSQL 17 apply/down contracts passed for 5 enforced migrations.",
  );
} finally {
  await db.close();
}
