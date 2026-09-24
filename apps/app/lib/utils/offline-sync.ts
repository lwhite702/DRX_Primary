const DB_NAME = "drx_crm_offline";
const DB_VERSION = 1;
export const STORES = { transactions: "transactions", inventory: "inventory", customers: "customers", credit: "credit" } as const;
export interface OfflineTransaction { id: string; type: "pos_checkout" | "credit_extension" | "credit_payment" | "inventory_update"; data: any; timestamp: number; synced: number; retry_count: number; }

export class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase | null> | null = null;

  async init(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise(resolve => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => { this.initPromise = null; this.db = null; resolve(null); };
        request.onblocked = () => { this.initPromise = null; this.db = null; resolve(null); };
        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORES.transactions)) { const store = db.createObjectStore(STORES.transactions, { keyPath: "id" }); store.createIndex("synced", "synced"); store.createIndex("timestamp", "timestamp"); }
          for (const name of [STORES.inventory, STORES.customers, STORES.credit]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
        };
        request.onsuccess = () => { const db = request.result; this.db = db; this.initPromise = null; db.onversionchange = () => { try { db.close(); } catch {} this.db = null; }; db.onclose = () => { this.db = null; }; db.onerror = () => { this.db = null; }; resolve(db); };
      } catch { this.initPromise = null; this.db = null; resolve(null); }
    });
    return this.initPromise;
  }

  private async withStore<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => Promise<T>, retry = true): Promise<T> {
    const db = await this.init(); if (!db) throw new Error("IndexedDB is not available");
    try { return await operation(db.transaction([storeName], mode).objectStore(storeName)); }
    catch (error: any) { const closing = error?.name === "InvalidStateError" || /closing|closed/i.test(error?.message ?? ""); if (retry && closing) { try { db.close(); } catch {} this.db = null; this.initPromise = null; return this.withStore(storeName, mode, operation, false); } throw error; }
  }

  async storeTransaction(type: OfflineTransaction["type"], data: any) {
    const transaction: OfflineTransaction = { id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, type, data, timestamp: Date.now(), synced: 0, retry_count: 0 };
    return this.withStore(STORES.transactions, "readwrite", store => new Promise<string>((resolve, reject) => { const request = store.add(transaction); request.onsuccess = () => resolve(transaction.id); request.onerror = () => reject(request.error); }));
  }
  async getPendingTransactions() { try { return await this.withStore(STORES.transactions, "readonly", store => new Promise<OfflineTransaction[]>((resolve, reject) => { const request = store.index("synced").getAll(0); request.onsuccess = () => resolve(request.result ?? []); request.onerror = () => reject(request.error); })); } catch { return []; } }
  async getPendingCount() { try { return await this.withStore(STORES.transactions, "readonly", store => new Promise<number>((resolve, reject) => { const request = store.index("synced").count(typeof IDBKeyRange === "undefined" ? (0 as any) : IDBKeyRange.only(0)); request.onsuccess = () => resolve(request.result ?? 0); request.onerror = () => reject(request.error); })); } catch { return 0; } }
  async markSynced(id: string) { try { await this.withStore(STORES.transactions, "readwrite", store => new Promise<void>((resolve, reject) => { const get = store.get(id); get.onsuccess = () => { if (!get.result) return resolve(); get.result.synced = 1; const put = store.put(get.result); put.onsuccess = () => resolve(); put.onerror = () => reject(put.error); }; get.onerror = () => reject(get.error); })); } catch {} }
  async incrementRetry(id: string) { try { await this.withStore(STORES.transactions, "readwrite", store => new Promise<void>((resolve, reject) => { const get = store.get(id); get.onsuccess = () => { if (!get.result) return resolve(); get.result.retry_count += 1; const put = store.put(get.result); put.onsuccess = () => resolve(); put.onerror = () => reject(put.error); }; get.onerror = () => reject(get.error); })); } catch {} }
  async cleanupOldTransactions() { return; }
  async syncPendingTransactions() { const pending = await this.getPendingTransactions(); return { success: 0, failed: pending.length, errors: pending.map(row => `Transaction ${row.id}: offline replay is paused until the canonical Convex offline mutation is enabled`) }; }
  isOnline() { return typeof navigator === "undefined" ? true : navigator.onLine ?? true; }
  setupListeners(onOnline: () => void, onOffline: () => void) { if (typeof window === "undefined") return; window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline); }
}

export const offlineSyncManager = new OfflineSyncManager();
