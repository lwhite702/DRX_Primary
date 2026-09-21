const DB_NAME = "drx_crm_offline";
const DB_VERSION = 1;
export const STORES = { transactions: "transactions", inventory: "inventory", customers: "customers", credit: "credit" } as const;
export interface OfflineTransaction { id: string; type: "pos_checkout" | "credit_extension" | "credit_payment" | "inventory_update"; data: any; timestamp: number; synced: number; retry_count: number; }

export class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  async init() {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
    if (this.db) return this.db;
    return await new Promise<IDBDatabase | null>(resolve => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => { this.db = request.result; resolve(this.db); };
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORES.transactions)) { const store = db.createObjectStore(STORES.transactions, { keyPath: "id" }); store.createIndex("synced", "synced"); store.createIndex("timestamp", "timestamp"); } for (const name of [STORES.inventory, STORES.customers, STORES.credit]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" }); };
    });
  }
  async storeTransaction(type: OfflineTransaction["type"], data: any) {
    const transaction: OfflineTransaction = { id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, type, data, timestamp: Date.now(), synced: 0, retry_count: 0 };
    const db = await this.init(); if (!db) throw new Error("IndexedDB is not available");
    await new Promise<void>((resolve, reject) => { const request = db.transaction([STORES.transactions], "readwrite").objectStore(STORES.transactions).add(transaction); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
    return transaction.id;
  }
  async getPendingTransactions() { const db = await this.init(); if (!db) return []; return await new Promise<OfflineTransaction[]>(resolve => { const request = db.transaction([STORES.transactions], "readonly").objectStore(STORES.transactions).index("synced").getAll(0); request.onsuccess = () => resolve(request.result ?? []); request.onerror = () => resolve([]); }); }
  async getPendingCount() { return (await this.getPendingTransactions()).length; }
  async markSynced(transactionId: string) { const db = await this.init(); if (!db) return; const store = db.transaction([STORES.transactions], "readwrite").objectStore(STORES.transactions); const row = await new Promise<OfflineTransaction | undefined>(resolve => { const request = store.get(transactionId); request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(undefined); }); if (row) { row.synced = 1; store.put(row); } }
  async incrementRetry(transactionId: string) { const db = await this.init(); if (!db) return; const store = db.transaction([STORES.transactions], "readwrite").objectStore(STORES.transactions); const request = store.get(transactionId); request.onsuccess = () => { if (request.result) { request.result.retry_count += 1; store.put(request.result); } }; }
  async cleanupOldTransactions() { return; }
  async syncPendingTransactions() { const pending = await this.getPendingTransactions(); return { success: 0, failed: pending.length, errors: pending.map(row => `Transaction ${row.id}: offline replay is paused until the canonical Convex offline mutation is enabled`) }; }
  isOnline() { return typeof navigator === "undefined" ? true : navigator.onLine ?? true; }
}

export const offlineSyncManager = new OfflineSyncManager();
