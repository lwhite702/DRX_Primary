import { afterEach, expect, it, vi } from "vitest";
import { aliasWeightGrams, loadUnitAliases } from "../../lib/inventory/unit-aliases-client";
afterEach(() => { vi.unstubAllGlobals(); });
it("collects every page using the selected business and preserves abort signals", async () => {
  const row = { id: "a", alias_name: "Synthetic", standard_unit: "g", quantity: 1.2345, is_enabled: true, is_system_default: false };
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [row], nextCursor: "cursor-a" }))).mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ ...row, id: "b" }], nextCursor: null })));
  vi.stubGlobal("fetch", fetcher); const controller = new AbortController();
  const rows = await loadUnitAliases("tenant-a", controller.signal);
  expect(rows).toHaveLength(2); expect(rows[0].quantity).toBe(1.2345);
  expect(fetcher.mock.calls[1][0]).toContain("cursor=cursor-a");
  expect(fetcher.mock.calls[1][1]).toMatchObject({ headers: { "X-Business-Id": "tenant-a" }, signal: controller.signal, cache: "no-store" });
});
it("rejects a repeated cursor instead of returning truncated history", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: [], nextCursor: "same" }))));
  await expect(loadUnitAliases("tenant-a")).rejects.toThrow(/pagination/);
});
it("converts ounces to grams while leaving gram quantities precise", () => {
  expect(aliasWeightGrams({ standard_unit: "oz", quantity: 1 })).toBeCloseTo(28.349523125, 9);
  expect(aliasWeightGrams({ standard_unit: "g", quantity: 1.2345 })).toBe(1.2345);
});
