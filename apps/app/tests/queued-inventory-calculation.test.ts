import { expect, it } from "vitest";
import { calculateQueuedInventory } from "../lib/utils/queued-inventory-calculation";
const now = Date.parse("2026-01-01T00:00:00.000Z");
const input = { analysisType: "all" as const, marginRequirement: 0.3, currentStock: 50, reorderLevel: 10, unitCost: 100, velocity: { velocity_7d: 10, velocity_30d: 10, velocity_90d: 10 } };
it("preserves queued critical-stock price and forecast formulas", () => {
  const result = calculateQueuedInventory(input, now);
  expect(result.pricingRec).toEqual({ recommended_price: 140.4, range_min: 110.00000000000001, range_max: 200, confidence: 75 });
  expect(result.forecast).toMatchObject({ days_until_stockout: 5, projected_stockout_date: "2026-01-06", recommended_restock: 400, urgency: "critical", risk_level: "low", confidence: 80 });
});
it("preserves stagnant, declining and zero-cost cases", () => {
  const stagnant = calculateQueuedInventory({ ...input, currentStock: 100, velocity: { velocity_7d: 0, velocity_30d: 0, velocity_90d: 0 } }, now);
  expect(stagnant.pricingRec?.recommended_price).toBe(119.6);
  expect(stagnant.forecast).toMatchObject({ days_until_stockout: null, projected_stockout_date: null, recommended_restock: 10, urgency: "low", risk_level: "high", confidence: 40 });
  const declining = calculateQueuedInventory({ ...input, currentStock: 150, velocity: { velocity_7d: 1, velocity_30d: 2, velocity_90d: 3 } }, now);
  expect(declining.pricingRec?.recommended_price).toBe(116.01); expect(declining.forecast?.recommended_restock).toBe(10);
  expect(calculateQueuedInventory({ ...input, unitCost: 0 }, now).pricingRec).toBeNull();
});
it("preserves mode separation and explicit timestamp", () => {
  expect(calculateQueuedInventory({ ...input, analysisType: "pricing" }, now).forecast).toBeNull();
  expect(calculateQueuedInventory({ ...input, analysisType: "inventory" }, now).pricingRec).toBeNull();
  expect(calculateQueuedInventory(input, now + 86400000).forecast?.projected_stockout_date).toBe("2026-01-07");
});
