import { createAppClient } from "@/lib/data/client/supabase-client";
import type { POSCheckout } from "@/lib/validations/schemas";

const DB_NAME = "drx_crm_offline";
const DB_VERSION = 1;
export const STORES = {
  transactions: "transactions",
  inventory: "inventory",
  customers: "customers",
  credit: "credit",
} as const;

export interface OfflineTransaction {
  id: string;
  type: "pos_checkout" | "credit_extension" | "credit_payment" | "inventory_update";
  data: any;
  timestamp: number;
  synced: number; // 0 = unsynced, 1 = synced
  retry_count: number;
}

export class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase | null> | null = null;

  async init(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return null;
    }

    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          this.initPromise = null;
          this.db = null;
          resolve(null);
        };

        request.onblocked = () => {
          this.initPromise = null;
          this.db = null;
          resolve(null);
        };

        request.onsuccess = () => {
          const db = request.result;
          this.db = db;
          this.initPromise = null;

          db.onversionchange = () => {
            try {
              db.close();
            } catch {}
            this.db = null;
          };

          db.onclose = () => {
            this.db = null;
          };

          db.onerror = () => {
            this.db = null;
          };

          resolve(db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object stores
          if (!db.objectStoreNames.contains(STORES.transactions)) {
            const txStore = db.createObjectStore(STORES.transactions, { keyPath: "id" });
            txStore.createIndex("synced", "synced");
            txStore.createIndex("timestamp", "timestamp");
          }

          if (!db.objectStoreNames.contains(STORES.inventory)) {
            db.createObjectStore(STORES.inventory, { keyPath: "id" });
          }

          if (!db.objectStoreNames.contains(STORES.customers)) {
            db.createObjectStore(STORES.customers, { keyPath: "id" });
          }

          if (!db.objectStoreNames.contains(STORES.credit)) {
            db.createObjectStore(STORES.credit, { keyPath: "id" });
          }
        };
      } catch {
        this.initPromise = null;
        this.db = null;
        resolve(null);
      }
    });

    return this.initPromise;
  }

  // Execute an operation with an object store, handling connection lifecycle recovery
  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const execute = async (retry: boolean): Promise<T> => {
      const db = await this.init();
      if (!db) {
        throw new Error("IndexedDB is not available");
      }

      try {
        const tx = db.transaction([storeName], mode);
        const store = tx.objectStore(storeName);
        return await operation(store, tx);
      } catch (err: any) {
        const isClosingOrClosed =
          err?.name === "InvalidStateError" ||
          (err?.message && (err.message.includes("closing") || err.message.includes("closed")));

        if (retry && isClosingOrClosed) {
          try {
            db.close();
          } catch {}
          this.db = null;
          this.initPromise = null;
          return execute(false);
        }
        throw err;
      }
    };

    return execute(true);
  }

  // Store transaction for offline sync
  async storeTransaction(
    type: OfflineTransaction["type"],
    data: any
  ): Promise<string> {
    const transaction: OfflineTransaction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      synced: 0,
      retry_count: 0,
    };

    return await this.withStore(STORES.transactions, "readwrite", (store) => {
      return new Promise<string>((resolve, reject) => {
        const request = store.add(transaction);
        request.onsuccess = () => resolve(transaction.id);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get pending transactions
  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    try {
      return await this.withStore(STORES.transactions, "readonly", (store) => {
        return new Promise<OfflineTransaction[]>((resolve, reject) => {
          const index = store.index("synced");
          const request = index.getAll(0);
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      });
    } catch {
      return [];
    }
  }

  // Get count of pending transactions
  async getPendingCount(): Promise<number> {
    try {
      return await this.withStore(STORES.transactions, "readonly", (store) => {
        return new Promise<number>((resolve, reject) => {
          const index = store.index("synced");
          const keyRange = typeof IDBKeyRange !== "undefined" ? IDBKeyRange.only(0) : (0 as any);
          const request = index.count(keyRange);
          request.onsuccess = () => resolve(request.result || 0);
          request.onerror = () => reject(request.error);
        });
      });
    } catch {
      return 0;
    }
  }

  // Mark transaction as synced
  async markSynced(transactionId: string): Promise<void> {
    try {
      await this.withStore(STORES.transactions, "readwrite", (store) => {
        return new Promise<void>((resolve, reject) => {
          const getRequest = store.get(transactionId);
          getRequest.onsuccess = () => {
            const transaction = getRequest.result;
            if (transaction) {
              transaction.synced = 1;
              const updateRequest = store.put(transaction);
              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = () => reject(updateRequest.error);
            } else {
              resolve();
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        });
      });
    } catch (err) {
      console.error("Failed to mark transaction as synced:", err);
    }
  }

  // Increment retry count
  async incrementRetry(transactionId: string): Promise<void> {
    try {
      await this.withStore(STORES.transactions, "readwrite", (store) => {
        return new Promise<void>((resolve, reject) => {
          const getRequest = store.get(transactionId);
          getRequest.onsuccess = () => {
            const transaction = getRequest.result;
            if (transaction) {
              transaction.retry_count += 1;
              const updateRequest = store.put(transaction);
              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = () => reject(updateRequest.error);
            } else {
              resolve();
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        });
      });
    } catch (err) {
      console.error("Failed to increment transaction retry:", err);
    }
  }

  // Delete synced transactions older than 7 days
  async cleanupOldTransactions(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    try {
      await this.withStore(STORES.transactions, "readwrite", (store) => {
        return new Promise<void>((resolve, reject) => {
          const index = store.index("timestamp");
          const keyRange = typeof IDBKeyRange !== "undefined" ? IDBKeyRange.upperBound(sevenDaysAgo) : undefined;
          const request = index.openCursor(keyRange);

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              if (cursor.value.synced === 1) {
                cursor.delete();
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      });
    } catch (err) {
      console.error("Failed to cleanup old transactions:", err);
    }
  }

  // Sync pending transactions
  async syncPendingTransactions(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const supabase = createAppClient();
    if (!supabase) {
      return { success: 0, failed: 0, errors: ["Supabase client not available"] };
    }

    const pending = await this.getPendingTransactions();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const transaction of pending) {
      // Skip if retried too many times
      if (transaction.retry_count >= 5) {
        errors.push(`Transaction ${transaction.id} exceeded max retries`);
        failed++;
        continue;
      }

      try {
        switch (transaction.type) {
          case "pos_checkout": {
            const { data, error } = await supabase.rpc("process_pos_checkout", {
              p_business_id: transaction.data.business_id,
              p_customer_id: transaction.data.customer_id || null,
              p_order_type: transaction.data.order_type,
              p_payment_method: transaction.data.payment_method,
              p_line_items: transaction.data.line_items,
              p_tax_amount: transaction.data.tax_amount,
              p_fees: transaction.data.fees || [],
            });

            if (error) throw error;
            await this.markSynced(transaction.id);
            success++;
            break;
          }

          case "credit_extension": {
            const { data, error } = await supabase.rpc("extend_credit", {
              p_business_id: transaction.data.business_id,
              p_customer_id: transaction.data.customer_id,
              p_amount: transaction.data.amount,
              p_description: transaction.data.description,
              p_due_date: transaction.data.due_date,
            });

            if (error) throw error;
            await this.markSynced(transaction.id);
            success++;
            break;
          }

          case "credit_payment": {
            const { data, error } = await supabase.rpc("process_credit_payment", {
              p_business_id: transaction.data.business_id,
              p_customer_id: transaction.data.customer_id,
              p_amount: transaction.data.amount,
              p_description: transaction.data.description,
            });

            if (error) throw error;
            await this.markSynced(transaction.id);
            success++;
            break;
          }

          default:
            errors.push(`Unknown transaction type: ${transaction.type}`);
            failed++;
        }
      } catch (error) {
        await this.incrementRetry(transaction.id);
        errors.push(
          `Transaction ${transaction.id}: ${error instanceof Error ? error.message : String(error)}`
        );
        failed++;
      }
    }

    return { success, failed, errors };
  }

  // Check online status
  isOnline(): boolean {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine ?? true;
  }

  // Setup online/offline listeners
  setupListeners(onOnline: () => void, onOffline: () => void): void {
    if (typeof window === "undefined") return;
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();
