import { afterEach, expect, it, vi } from "vitest";
import { quoteWeight } from "../../lib/pos/weight-quote-client";
afterEach(() => { vi.unstubAllGlobals(); });
it("uses canonical line cents and sends only quantity, identity and business context", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, quote: { lines: [{ source: "inventory", quantity: 2.5, appliedUnitPriceCents: 120, lineSubtotalCents: 300, bulkDiscountCents: 25 }] } })));
  vi.stubGlobal("fetch", fetcher); const controller = new AbortController();
  expect(await quoteWeight("tenant-a", "product-a", 2.5, controller.signal)).toEqual({ price_per_gram: 1.2, total_price: 3, tier_name: "Bulk pricing" });
  expect(fetcher.mock.calls[0][1]).toMatchObject({ headers: { "Content-Type": "application/json", "X-Business-Id": "tenant-a" }, signal: controller.signal });
  expect(JSON.parse(fetcher.mock.calls[0][1].body).items[0]).toMatchObject({ inventoryId: "product-a", weightGrams: 2.5, qty: 1, unitPrice: 0 });
});
it("rejects unavailable and mismatched quotes instead of manufacturing a zero price", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, quote: { lines: [{ source: "inventory", quantity: 99, appliedUnitPriceCents: 100, lineSubtotalCents: 100 }] } }))));
  await expect(quoteWeight("tenant-a", "product-a", 1)).rejects.toThrow(/unavailable/);
  await expect(quoteWeight("tenant-a", "product-a", 1)).rejects.toThrow(/verified/);
});
