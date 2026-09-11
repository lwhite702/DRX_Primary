import { afterEach, expect, it, vi } from "vitest";
import { recordCheck, InventoryCheckRejectedError } from "../../lib/pos/inventory-check-client";
afterEach(() => { vi.unstubAllGlobals(); });
const request = { requestId: "attempt", inventoryId: "product", expectedWeightGrams: 0, measuredWeightGrams: 1 };
const receipt = { success: true, check_id: "check", expected_weight_grams: 0, measured_weight_grams: 1, delta_grams: 1, delta_percentage: null, discrepancy_flagged: true, shrinkage_id: null };
it("preserves nullable percentages and the caller's snapshot/retry ID", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt))); vi.stubGlobal("fetch", fetch);
  expect(await recordCheck("tenant", request)).toEqual(receipt);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(request);
});
it("treats mismatched or malformed success responses as uncertain", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...receipt, measured_weight_grams: 2 }))));
  await expect(recordCheck("tenant", request)).rejects.toThrow("Retry the same request");
});
it("distinguishes stale rejection from an uncertain response without leaking error details", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "STALE_STOCK", error: "private details" }), { status: 409 })));
  await expect(recordCheck("tenant", request)).rejects.toBeInstanceOf(InventoryCheckRejectedError);
});
