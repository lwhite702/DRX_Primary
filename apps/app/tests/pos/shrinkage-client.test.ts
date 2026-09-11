import { afterEach, expect, it, vi } from "vitest";
import { recordShrinkage } from "../../lib/pos/shrinkage-client";
const request = { requestId: "same-attempt", inventoryId: "synthetic-product", quantityGrams: 0.4, shrinkageType: "damaged" as const };
afterEach(() => { vi.unstubAllGlobals(); });
it("sends caller-owned retry identity and accepts the canonical replay receipt", async () => {
  const receipt = { success: true, shrinkage_id: "receipt", new_inventory_grams: 1.6, costCents: 5, replayed: true };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt), { status: 201 })); vi.stubGlobal("fetch", fetch);
  expect(await recordShrinkage("tenant", request)).toEqual(receipt);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(request);
  expect(fetch.mock.calls[0][1].headers["X-Business-Id"]).toBe("tenant");
});
it.each([null, {}, { success: true, shrinkage_id: "receipt", new_inventory_grams: -1, costCents: 5, replayed: false }])("rejects malformed success receipts", async value => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(value), { status: 201 })));
  await expect(recordShrinkage("tenant", request)).rejects.toThrow("Shrinkage could not be confirmed. Retry the same request.");
});
it("shows approval requirements without echoing arbitrary backend error text", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "APPROVAL_REQUIRED", error: "private details" }), { status: 403 })));
  await expect(recordShrinkage("tenant", request)).rejects.toThrow("Supervisor approval is required");
});
