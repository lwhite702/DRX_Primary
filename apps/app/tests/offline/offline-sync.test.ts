import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineSyncManager, STORES } from "@/lib/utils/offline-sync";

describe("OfflineSyncManager IndexedDB resilience", () => {
  const originalIndexedDB = global.indexedDB;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports valid store definitions", () => {
    expect(STORES.transactions).toBe("transactions");
    expect(STORES.inventory).toBe("inventory");
    expect(STORES.customers).toBe("customers");
    expect(STORES.credit).toBe("credit");
  });

  it("handles missing indexedDB gracefully without throwing", async () => {
    delete (global as any).window;
    delete (global as any).indexedDB;

    const manager = new OfflineSyncManager();
    const db = await manager.init();
    expect(db).toBeNull();
    const count = await manager.getPendingCount();
    expect(count).toBe(0);
    const pending = await manager.getPendingTransactions();
    expect(pending).toEqual([]);

    (global as any).window = originalWindow;
    (global as any).indexedDB = originalIndexedDB;
  });

  it("recovers automatically from InvalidStateError when database connection is closing", async () => {
    let openCount = 0;
    let transactionCallCount = 0;

    const mockDbFactory = (isClosingFirstTime: boolean) => {
      let closed = false;
      const mockStore = {
        index: vi.fn().mockReturnValue({
          count: vi.fn().mockImplementation(() => {
            const req: any = {};
            setTimeout(() => {
              req.result = 3;
              if (req.onsuccess) req.onsuccess();
            }, 0);
            return req;
          }),
        }),
      };

      const mockDb: any = {
        close: vi.fn(() => {
          closed = true;
        }),
        transaction: vi.fn((_stores: string[], _mode: string) => {
          transactionCallCount++;
          if (isClosingFirstTime && transactionCallCount === 1) {
            const err = new DOMException(
              "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
              "InvalidStateError",
            );
            throw err;
          }
          return {
            objectStore: vi.fn().mockReturnValue(mockStore),
          };
        }),
      };

      return mockDb;
    };

    const mockIndexedDB: any = {
      open: vi.fn(() => {
        openCount++;
        const req: any = {};
        setTimeout(() => {
          req.result = mockDbFactory(openCount === 1);
          if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
      }),
    };

    (global as any).indexedDB = mockIndexedDB;
    (global as any).window = { indexedDB: mockIndexedDB };

    const manager = new OfflineSyncManager();
    const count = await manager.getPendingCount();

    // Should have retried after the closing error and succeeded on second attempt
    expect(openCount).toBe(2);
    expect(transactionCallCount).toBe(2);
    expect(count).toBe(3);

    (global as any).window = originalWindow;
    (global as any).indexedDB = originalIndexedDB;
  });

  it("handles database onversionchange and onclose by resetting connection", async () => {
    let mockDbInstance: any = null;

    const mockIndexedDB: any = {
      open: vi.fn(() => {
        const req: any = {};
        mockDbInstance = {
          close: vi.fn(),
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              index: vi.fn().mockReturnValue({
                count: vi.fn().mockImplementation(() => {
                  const r: any = {};
                  setTimeout(() => {
                    r.result = 5;
                    if (r.onsuccess) r.onsuccess();
                  }, 0);
                  return r;
                }),
              }),
            }),
          }),
        };
        setTimeout(() => {
          req.result = mockDbInstance;
          if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
      }),
    };

    (global as any).indexedDB = mockIndexedDB;
    (global as any).window = { indexedDB: mockIndexedDB };

    const manager = new OfflineSyncManager();
    await manager.init();
    expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);

    // Trigger versionchange event
    mockDbInstance.onversionchange?.();
    expect(mockDbInstance.close).toHaveBeenCalled();

    // Next call should open a fresh connection
    const count = await manager.getPendingCount();
    expect(count).toBe(5);
    expect(mockIndexedDB.open).toHaveBeenCalledTimes(2);

    (global as any).window = originalWindow;
    (global as any).indexedDB = originalIndexedDB;
  });

  it("deduplicates concurrent init() calls into a single opening promise", async () => {
    const mockIndexedDB: any = {
      open: vi.fn(() => {
        const req: any = {};
        setTimeout(() => {
          req.result = {
            close: vi.fn(),
          };
          if (req.onsuccess) req.onsuccess();
        }, 10);
        return req;
      }),
    };

    (global as any).indexedDB = mockIndexedDB;
    (global as any).window = { indexedDB: mockIndexedDB };

    const manager = new OfflineSyncManager();
    const [db1, db2, db3] = await Promise.all([
      manager.init(),
      manager.init(),
      manager.init(),
    ]);

    expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    expect(db1).toBe(db2);
    expect(db2).toBe(db3);

    (global as any).window = originalWindow;
    (global as any).indexedDB = originalIndexedDB;
  });
});
