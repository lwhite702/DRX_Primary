import assert from "node:assert/strict";
import { generatePricingRecommendation } from "../lib/utils/pricing-recommendation";
import { generateInventoryForecast } from "../lib/utils/inventory-forecast";

// Synthetic calculation check only; canonical persistence is verified separately
// by tests/convex/inventory-intelligence*.test.ts.
const pricing = generatePricingRecommendation({
  cost: 100, currentPrice: 150, costHistory: [90, 95, 100],
  salesVelocity7d: 10, salesVelocity30d: 8, currentStock: 50,
  marginRequirement: 0.3,
});
assert(Number.isFinite(pricing.recommendedPrice) && pricing.recommendedPrice > 100);
const forecast = generateInventoryForecast({
  currentStock: 20, velocity7d: 5, velocity30d: 4,
  reorderLevel: 50, supplierLeadTimeDays: 7,
}, Date.parse("2026-01-01T00:00:00.000Z"));
assert.equal(forecast.daysUntilStockout, 4);
assert.equal(forecast.restockUrgency, "critical");
assert.equal(forecast.projectedStockoutDate, "2026-01-05");
console.log("Synthetic pricing and inventory forecast calculations passed; persistence and live behavior are separate gates.");
