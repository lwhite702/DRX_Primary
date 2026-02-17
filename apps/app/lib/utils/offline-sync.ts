import { createAppClient } from "@/lib/data/client/supabase-client";
import type { POSCheckout } from "@/lib/validations/schemas";

const DB_NAME = "drx_crm_offline";
const DB_VERSION = 1;
const STORES = {
  transactions: "transactions",
  inventory: "inventory",
  customers: "customers",
  credit: "credit",
};

interface OfflineTransaction {
  id: string;
  type: "pos_checkout" | "credit_extension" | "credit_payment" | "inventory_update";
  data: any;
  timestamp: number;
  synced: number; // 0 = unsynced, 1 = synced
  retry_count: number;
}

export class OfflineSyncManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
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
    });
  }

  // Store transaction for offline sync
  async storeTransaction(
    type: OfflineTransaction["type"],
    data: any
  ): Promise<string> {
    if (!this.db) await this.init();

    const transaction: OfflineTransaction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      synced: 0,
      retry_count: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.transactions], "readwrite");
      const store = tx.objectStore(STORES.transactions);
      const request = store.add(transaction);

      request.onsuccess = () => resolve(transaction.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending transactions
  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.transactions], "readonly");
      const store = tx.objectStore(STORES.transactions);
      const index = store.index("synced");
      const request = index.getAll(0);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get count of pending transactions
  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.transactions], "readonly");
      const store = tx.objectStore(STORES.transactions);
      const index = store.index("synced");
      const request = index.count(IDBKeyRange.only(0));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark transaction as synced
  async markSynced(transactionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.transactions], "readwrite");
      const store = tx.objectStore(STORES.transactions);
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
  }

  // Increment retry count
  async incrementRetry(transactionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.transactions], "readwrite");
      const store = tx.objectStore(STORES.transactions);
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
  }

  // Delete synced transactions older than 7 days
  async cleanupOldTransactions(): Promise<void> {
    if (!this.db) await this.init();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.transactions], "readwrite");
      const store = tx.objectStore(STORES.transactions);
      const index = store.index("timestamp");
      const request = index.openCursor(IDBKeyRange.upperBound(sevenDaysAgo));

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
    return navigator.onLine;
  }

  // Setup online/offline listeners
  setupListeners(onOnline: () => void, onOffline: () => void): void {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();

