import { afterEach, expect, it, vi } from "vitest";
import { POSEngine } from "../../lib/utils/pos-engine";
afterEach(() => { vi.unstubAllGlobals(); });
it("unwraps recommendations and surfaces unavailable or malformed results", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); const engine = new POSEngine();
  const items = [{ id: "synthetic" }]; fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items, data: items })));
  expect(await engine.getAIPricingRecommendations("synthetic business")).toEqual(items);
  expect(fetch.mock.calls[0][0]).toContain("synthetic%20business");
  fetch.mockResolvedValueOnce(new Response("{}", { status: 503 })); await expect(engine.getAIPricingRecommendations("business")).rejects.toThrow(/unavailable/);
  fetch.mockResolvedValueOnce(new Response("{}")); await expect(engine.getAIPricingRecommendations("business")).rejects.toThrow(/Invalid/);
});
it("sends the selected business and preserves the recommendation on uncertain retries", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); const engine = new POSEngine();
  fetch.mockRejectedValueOnce(new Error("private transport failure"));
  expect(await engine.applyAIPricingRecommendation("business", "recommendation")).toEqual({ success: false, message: "Price update was not confirmed. Retry the same recommendation." });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, newPrice: 1.25 })));
  expect(await engine.applyAIPricingRecommendation("business", "recommendation")).toMatchObject({ success: true, newPrice: 1.25 });
  expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ businessId: "business", recommendationId: "recommendation" });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, newPrice: 99 }), { status: 409 }));
  expect((await engine.applyAIPricingRecommendation("business", "recommendation")).success).toBe(false);
});
