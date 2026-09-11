/** Browser-local encrypted requests. Confirmed accounting lives only in Convex. */
export interface CreditQueueScope { deployment: string; operatorId: string; businessId: string }
export interface CreditRequestInput {
  customerId: string; kind: "issue" | "payment"; amountCents: number;
  description?: string; dueDate?: string; paymentMethod?: "cash" | "check" | "transfer" | "other";
}
export interface PendingCreditRequest extends CreditRequestInput {
  requestKey: string; operatorId: string; businessId: string; createdAt: number;
}
export interface SealedCreditRequest { id: string; scope: string; iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer; sequence?: number }
export interface CreditQueueStorage {
  key(scope: string, candidate?: CryptoKey): Promise<CryptoKey | undefined>;
  list(scope: string, limit: number): Promise<SealedCreditRequest[]>;
  add(record: SealedCreditRequest): Promise<void>;
  remove(scope: string, id: string): Promise<void>;
}

/** Resolves only after the IDB transaction commits, including key creation. */
function committed<T>(tx: IDBTransaction, value: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(value());
    tx.onabort = tx.onerror = () => reject(new Error("Local credit storage is unavailable"));
  });
}
export class IndexedDBCreditQueueStorage implements CreditQueueStorage {
  private opening?: Promise<IDBDatabase>;
  private open() {
    if (!this.opening) this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error("Local credit storage is unavailable")); return; }
      const request = indexedDB.open("drx-credit-queue-v1", 1);
      let settled = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("keys", { keyPath: "scope" });
        db.createObjectStore("requests", { keyPath: "id" }).createIndex("scope", ["scope", "sequence"]);
      };
      request.onerror = request.onblocked = () => { settled = true; reject(new Error("Local credit storage is unavailable")); };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        settled = true;
        db.onversionchange = () => { db.close(); this.opening = undefined; };
        db.onclose = () => { this.opening = undefined; };
        resolve(db);
      };
    }).catch(error => { this.opening = undefined; throw error; });
    return this.opening;
  }
  async key(scope: string, candidate?: CryptoKey) {
    const db = await this.open();
    const tx = db.transaction("keys", candidate ? "readwrite" : "readonly");
    let result: CryptoKey | undefined;
    const done = committed(tx, () => result);
    const store = tx.objectStore("keys");
    const request = store.get(scope);
    request.onsuccess = () => {
      result = request.result?.key;
      if (!result && candidate) {
        try { result = candidate; store.add({ scope, key: candidate, nextSequence: 0 }); } catch { tx.abort(); }
      }
    };
    return done;
  }
  async list(scope: string, limit: number) {
    const db = await this.open(); const tx = db.transaction("requests", "readonly");
    let result: SealedCreditRequest[] = [];
    const done = committed(tx, () => result);
    const request = tx.objectStore("requests").index("scope").getAll(IDBKeyRange.bound([scope, 0], [scope, Number.MAX_SAFE_INTEGER]), limit);
    request.onsuccess = () => { result = request.result; };
    return done;
  }
  async add(record: SealedCreditRequest) {
    const db = await this.open(); const tx = db.transaction(["requests", "keys"], "readwrite");
    const done = committed(tx, () => undefined);
    const keys = tx.objectStore("keys"); const request = keys.get(record.scope);
    request.onsuccess = () => {
      try {
        const saved = request.result;
        const sequence = (saved?.nextSequence ?? 0) + 1;
        if (!saved?.key || !Number.isSafeInteger(sequence)) { tx.abort(); return; }
        // Commit order is durable across tabs, including equal timestamps.
        tx.objectStore("requests").add({ ...record, sequence });
        keys.put({ ...saved, nextSequence: sequence });
      } catch { tx.abort(); }
    };
    await done;
  }
  async remove(scope: string, id: string) {
    const db = await this.open(); const tx = db.transaction("requests", "readwrite");
    const done = committed(tx, () => undefined);
    const store = tx.objectStore("requests"); const request = store.get(id);
    request.onsuccess = () => {
      if (request.result && request.result.scope !== scope) { tx.abort(); return; }
      store.delete(id);
    };
    await done;
  }
}

function validate(input: CreditRequestInput) {
  if (typeof input.customerId !== "string" || !input.customerId || !["issue", "payment"].includes(input.kind) || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 || (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 500))) throw new Error("Invalid credit request");
  if (input.paymentMethod !== undefined && (input.kind !== "payment" || !["cash", "check", "transfer", "other"].includes(input.paymentMethod))) throw new Error("Invalid credit payment method");
  if (input.dueDate !== undefined) {
    if (typeof input.dueDate !== "string") throw new Error("Invalid credit due date");
    const date = new Date(input.dueDate + "T00:00:00.000Z");
    if (input.kind !== "issue" || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || input.dueDate.startsWith("0000-") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.dueDate) throw new Error("Invalid credit due date");
  }
}
export class CreditPendingQueue {
  constructor(private storage: CreditQueueStorage = new IndexedDBCreditQueueStorage(), private cryptoProvider: Crypto = globalThis.crypto) {}
  private async scopeKey(scope: CreditQueueScope) {
    if (!scope.operatorId || !scope.businessId || !scope.deployment) throw new Error("Sign in before saving credit requests");
    const encoded = new TextEncoder().encode(JSON.stringify([new URL(scope.deployment).origin, scope.operatorId, scope.businessId]));
    return Array.from(new Uint8Array(await this.cryptoProvider.subtle.digest("SHA-256", encoded)), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  async create(scope: CreditQueueScope, input: CreditRequestInput): Promise<PendingCreditRequest> {
    scope = { ...scope }; input = { ...input };
    validate(input);
    const scopeKey = await this.scopeKey(scope);
    const candidate = await this.cryptoProvider.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const key = await this.storage.key(scopeKey, candidate);
    if (!key) throw new Error("Unable to protect the pending credit request");
    const entry: PendingCreditRequest = { ...input, requestKey: this.cryptoProvider.randomUUID(), operatorId: scope.operatorId, businessId: scope.businessId, createdAt: Date.now() };
    const iv = this.cryptoProvider.getRandomValues(new Uint8Array(12));
    const ciphertext = await this.cryptoProvider.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(scopeKey + ":" + entry.requestKey) }, key, new TextEncoder().encode(JSON.stringify(entry)));
    await this.storage.add({ id: entry.requestKey, scope: scopeKey, iv, ciphertext });
    return entry;
  }
  async pending(scope: CreditQueueScope): Promise<{ entries: PendingCreditRequest[]; hasMore: boolean }> {
    scope = { ...scope };
    const scopeKey = await this.scopeKey(scope);
    const records = await this.storage.list(scopeKey, 101);
    if (!records.length) return { entries: [], hasMore: false };
    const key = await this.storage.key(scopeKey);
    if (!key) throw new Error("Unable to unlock pending credit requests");
    const entries: PendingCreditRequest[] = [];
    for (const record of records.slice(0, 100)) {
      try {
        if (record.scope !== scopeKey) throw new Error("scope");
        const plaintext = await this.cryptoProvider.subtle.decrypt({ name: "AES-GCM", iv: record.iv, additionalData: new TextEncoder().encode(scopeKey + ":" + record.id) }, key, record.ciphertext);
        const entry = JSON.parse(new TextDecoder().decode(plaintext)) as PendingCreditRequest;
        validate(entry);
        if (entry.requestKey !== record.id || entry.operatorId !== scope.operatorId || entry.businessId !== scope.businessId || !Number.isSafeInteger(entry.createdAt)) throw new Error("scope");
        entries.push(entry);
      } catch { throw new Error("Unable to unlock pending credit requests"); }
    }
    return { entries, hasMore: records.length > 100 };
  }
  async confirm(scope: CreditQueueScope, requestKey: string) {
    await this.storage.remove(await this.scopeKey(scope), requestKey);
  }
}

/** Call only with the current authenticated operator; server checks it again. */
export async function syncCreditRequests(queue: CreditPendingQueue, scope: CreditQueueScope, isCurrent: () => boolean, send: typeof fetch = globalThis.fetch) {
  scope = { ...scope };
  let confirmed = 0;
  if (!isCurrent()) throw new Error("Sign in to sync your credit requests");
  const { entries, hasMore } = await queue.pending(scope);
  for (const entry of entries) {
    if (!isCurrent()) throw new Error("Sign in to sync your credit requests");
    let response: Response;
    try { response = await send("/api/credit/transactions", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Business-Id": scope.businessId, "Idempotency-Key": entry.requestKey },
      body: JSON.stringify({ customer_id: entry.customerId, business_id: scope.businessId, expectedUserId: scope.operatorId, transaction_type: entry.kind === "issue" ? "extension" : "payment", amountCents: entry.amountCents, description: entry.description, due_date: entry.dueDate, payment_method: entry.paymentMethod }),
    }); } catch { throw new Error("Credit request is still pending. Sign in and retry, or check its status."); }
    if (response.status !== 201 || response.headers.get("Idempotency-Key") !== entry.requestKey) throw new Error("Credit request is still pending. Sign in and retry, or check its status.");
    let result;
    try { result = await response.json(); } catch { throw new Error("Credit request is still pending. Check its status before replacing it."); }
    if (!isCurrent()) throw new Error("Sign in to sync your credit requests");
    if (!result || typeof result.id !== "string" || !result.id.trim() ||
      result.customerId !== entry.customerId || result.createdBy !== scope.operatorId ||
      result.transactionType !== (entry.kind === "issue" ? "extension" : "payment") ||
      result.amountCents !== entry.amountCents || result.status !== "completed" ||
      !Number.isSafeInteger(result.balanceAfterCents) || result.balanceAfterCents < 0) {
      throw new Error("Credit request is still pending. Check its status before replacing it.");
    }
    await queue.confirm(scope, entry.requestKey);
    confirmed++;
  }
  return { confirmed, hasMore };
}

/** Resolve on the server before clearing an uncertain local attempt. Never reverses a recorded transaction. */
export async function resolveCreditRequests(queue: CreditPendingQueue, scope: CreditQueueScope, isCurrent: () => boolean, send: typeof fetch = globalThis.fetch) {
  scope = { ...scope };
  let confirmed = 0, cancelled = 0;
  if (!isCurrent()) throw new Error("Sign in to resolve your credit requests");
  const { entries, hasMore } = await queue.pending(scope);
  for (const entry of entries) {
    if (!isCurrent()) throw new Error("Sign in to resolve your credit requests");
    let result;
    try {
      const response = await send("/api/credit/requests/resolve", { method: "POST", headers: { "Content-Type": "application/json", "X-Business-Id": scope.businessId }, body: JSON.stringify({ business_id: scope.businessId, customer_id: entry.customerId, expectedUserId: scope.operatorId, requestKey: entry.requestKey }) });
      if (!response.ok) throw new Error("unavailable");
      result = await response.json();
    } catch { throw new Error("Credit request could not be resolved. Keep it pending and retry."); }
    if (!isCurrent()) throw new Error("Sign in to resolve your credit requests");
    if (!result || result.requestKey !== entry.requestKey || result.customerId !== entry.customerId || result.operatorId !== scope.operatorId ||
      !["recorded", "cancelled"].includes(result.status) || (result.status === "recorded" && (!Number.isSafeInteger(result.balanceAfterCents) || result.balanceAfterCents < 0))) throw new Error("Credit request could not be resolved. Keep it pending and retry.");
    await queue.confirm(scope, entry.requestKey);
    if (result.status === "recorded") confirmed++; else cancelled++;
  }
  return { confirmed, cancelled, hasMore };
}
