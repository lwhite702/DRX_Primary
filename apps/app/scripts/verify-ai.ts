import {
  PricingEngine,
  type PricingFactors,
} from "../lib/utils/pricing-engine";
import {
  InventoryEngine,
  type InventoryFactors,
} from "../lib/utils/inventory-engine";

async function verifyAILogic() {
  console.log("Starting AI Logic Verification...");

  // 1. Verify Pricing Engine
  console.log("\n--- Testing Pricing Engine ---");
  const pricingEngine = new PricingEngine();

  const pricingFactors: PricingFactors = {
    cost: 100,
    currentPrice: 150,
    costHistory: [90, 95, 100], // Rising cost trend
    salesVelocity7d: 10,
    salesVelocity30d: 8, // Accelerating demand
    currentStock: 50,
    marginRequirement: 0.3,
  };

  console.log("Input Factors:", JSON.stringify(pricingFactors, null, 2));

  try {
    const recommendation = await pricingEngine.generateRecommendation(
      pricingFactors
    );
    console.log(
      "Pricing Recommendation:",
      JSON.stringify(recommendation, null, 2)
    );

    if (recommendation.recommendedPrice > 100) {
      console.log("✅ Pricing Engine produced a valid recommendation.");
    } else {
      console.error("❌ Pricing Engine produced suspicious recommendation.");
    }
  } catch (e) {
    console.error("❌ Error in Pricing Engine:", e);
  }

  // 2. Verify Inventory Engine
  console.log("\n--- Testing Inventory Engine ---");
  const inventoryEngine = new InventoryEngine();

  const inventoryFactors: Partial<InventoryFactors> = {
    currentStock: 20,
    velocity7d: 5, // Will run out in 4 days
    velocity30d: 4,
    reorderLevel: 50,
    supplierLeadTimeDays: 7,
  };

  console.log("Input Factors:", JSON.stringify(inventoryFactors, null, 2));

  try {
    const forecast = await inventoryEngine.generateForecast(
      "test-inventory-id",
      "test-business-id",
      inventoryFactors
    );
    console.log("Inventory Forecast:", JSON.stringify(forecast, null, 2));

    if (
      forecast.daysUntilStockout === 4 &&
      forecast.restockUrgency === "critical"
    ) {
      console.log(
        "✅ Inventory Engine correctly identified critical stockout risk."
      );
    } else {
      console.warn("⚠️ Inventory Engine results check:", {
        daysUntilStockout: forecast.daysUntilStockout,
        expectedDays: 4,
        urgency: forecast.restockUrgency,
        expectedUrgency: "critical",
      });
    }
  } catch (e) {
    console.error("❌ Error in Inventory Engine:", e);
  }
}

verifyAILogic();
