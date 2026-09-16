import { afterEach, expect, it, vi } from "vitest";
import { loadShrinkageInventory } from "../../lib/pos/shrinkage-inventory-client";
afterEach(() => { vi.unstubAllGlobals(); });
const product = { id: "product", productName: "Synthetic", sku: "SKU", inventoryInGrams: 2 };
const response = (data: unknown[], isDone: boolean, continueCursor?: string) => new Response(JSON.stringify({ data, isDone, continueCursor }));
it("loads every catalog page and excludes depleted products", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response([{ ...product, inventoryInGrams: 0 }], false, "next-page")).mockResolvedValueOnce(response([product], true));
  vi.stubGlobal("fetch", fetch);
  expect(await loadShrinkageInventory("tenant")).toEqual([product]);
  expect(fetch.mock.calls[1][0]).toContain("cursor=next-page");
  expect(fetch.mock.calls[1][1].headers["X-Business-Id"]).toBe("tenant");
});
it("rejects repeated cursors rather than showing an incomplete inventory", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(response([product], false, "same"))));
  await expect(loadShrinkageInventory("tenant")).rejects.toThrow("Inventory page could not be confirmed");
});
it("rejects malformed stock data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ ...product, inventoryInGrams: "2" }], true)));
  await expect(loadShrinkageInventory("tenant")).rejects.toThrow("Inventory requires reconciliation");
});
