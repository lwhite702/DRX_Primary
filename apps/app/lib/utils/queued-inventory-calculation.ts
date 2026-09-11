/** Preserves the existing queued worker formulas independently of storage. */
export function calculateQueuedInventory(input: {
  analysisType: "all" | "pricing" | "inventory";
  marginRequirement: number;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  velocity: { velocity_7d: number; velocity_30d: number; velocity_90d: number };
}, now: number) {
  const { analysisType: analysis_type, marginRequirement: margin_requirement, currentStock, reorderLevel, unitCost, velocity } = input;
// Generate pricing recommendation
let pricingRec = null;
if (analysis_type === "pricing" || analysis_type === "all") {
  const cost = unitCost;
  if (cost > 0) {
    const baselinePrice = cost * (1 + margin_requirement);
    let priceAdjustment = 1.0;

    const avgVelocity = (velocity.velocity_7d + velocity.velocity_30d) / 2;
    const daysSupply = avgVelocity > 0 ? currentStock / avgVelocity : Infinity;

    if (daysSupply > 90) priceAdjustment *= 0.92;
    else if (daysSupply < 7) priceAdjustment *= 1.08;

    const recentTrend =
      ((velocity.velocity_7d - velocity.velocity_30d) /
        Math.max(velocity.velocity_30d, 0.01)) *
      100;
    if (recentTrend > 20) priceAdjustment *= 1.06;
    else if (recentTrend < -20) priceAdjustment *= 0.97;

    const recommendedPrice = Math.round(baselinePrice * priceAdjustment * 100) / 100;
    const minPrice = cost * 1.1;
    const maxPrice = cost * 2.0;

    pricingRec = {
      recommended_price: Math.max(minPrice, Math.min(recommendedPrice, maxPrice)),
      range_min: minPrice,
      range_max: maxPrice,
      confidence: 75,
    };
  }
}

// Generate inventory forecast
let forecast = null;
if (analysis_type === "inventory" || analysis_type === "all") {
  const avgVelocity =
    (velocity.velocity_7d + velocity.velocity_30d + velocity.velocity_90d) / 3;
  const daysSupply = avgVelocity > 0 ? currentStock / avgVelocity : Infinity;

  let urgency: "low" | "medium" | "high" | "critical" = "low";
  let riskLevel: "low" | "medium" | "high" = "low";

  if (avgVelocity > 0) {
    if (daysSupply < 7) urgency = "critical";
    else if (daysSupply < 14) urgency = "high";
    else if (daysSupply < 30) urgency = "medium";
  } else {
    urgency = "low";
    riskLevel = currentStock > reorderLevel * 2 ? "high" : "medium";
  }

  const recommendedRestock = Math.max(
    reorderLevel,
    Math.ceil(avgVelocity * (45 - Math.min(daysSupply, 45)))
  );

  const stockoutDate =
    avgVelocity > 0
      ? new Date(now + (currentStock / avgVelocity) * 24 * 60 * 60 * 1000)
      : null;

  forecast = {
    projected_stockout_date: stockoutDate?.toISOString().split("T")[0] || null,
    days_until_stockout: daysSupply === Infinity ? null : Math.floor(daysSupply),
    recommended_restock: recommendedRestock,
    urgency,
    risk_level: riskLevel,
    confidence: avgVelocity > 0 ? 80 : 40,
  };
}

  return { pricingRec, forecast };
}
