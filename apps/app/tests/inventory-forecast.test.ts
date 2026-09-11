import { expect, it } from "vitest";
import { generateInventoryForecast } from "../lib/utils/inventory-forecast";
const now = Date.parse("2024-02-27T23:30:00.000Z");
it("projects fractional inventory across leap day without rounding the underlying stock or velocity", () => {
  const result = generateInventoryForecast({ currentStock: 2.5, velocity7d: 0.25, velocity30d: 0.25, velocity90d: 0.25, reorderLevel: 2, restockCost: 1.234 }, now);
  expect(result.daysUntilStockout).toBe(10);
  expect(result.projectedStockoutDate).toBe("2024-03-08");
  expect(result.recommendedRestockQuantity).toBe(9.5);
  expect(result.factors.estimated_restock_cost).toBeCloseTo(11.723);
  expect(result.reasoning).toContain("$11.72");
  expect(result.velocityTrend).toBe("stable"); expect(result.restockUrgency).toBe("high");
});
it("preserves stagnant and critical stockout scenarios", () => {
  const stagnant = generateInventoryForecast({ currentStock: 100, reorderLevel: 10 }, now);
  expect(stagnant).toMatchObject({ projectedStockoutDate: null, daysUntilStockout: null, recommendedRestockQuantity: 0, inventoryRiskLevel: "high", velocityTrend: "stagnant", confidenceScore: 30 });
  const critical = generateInventoryForecast({ currentStock: 20, velocity7d: 5, velocity30d: 4, reorderLevel: 50, supplierLeadTimeDays: 7 }, now);
  expect(critical).toMatchObject({ daysUntilStockout: 4, restockUrgency: "critical", inventoryRiskLevel: "high", velocityTrend: "accelerating" });
});
it("uses the caller's timestamp deterministically without mutating factors", () => {
  const factors = Object.freeze({ currentStock: 10, velocity7d: 2, velocity30d: 2, reorderLevel: 1 });
  const first = generateInventoryForecast(factors, now);
  expect(generateInventoryForecast(factors, now)).toEqual(first);
  const later = generateInventoryForecast(factors, now + 86400000);
  expect(later.projectedStockoutDate).toBe("2024-03-04");
  expect(later.daysUntilStockout).toBe(first.daysUntilStockout);
});
