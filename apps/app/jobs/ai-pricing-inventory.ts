import { createFunction } from "@wrelik/jobs";
import { db } from "@/lib/db";

export const aiPricingInventoryFunction = createFunction(
  "ai-pricing-inventory-analysis",
  { event: "ai/pricing-inventory.analyze" },
  async ({ event, step }: any) => {
    const {
      business_id,
      analysis_type = "all",
      margin_requirement = 0.3,
      supplier_lead_time_days = 7,
    } = event.data;

    // 1. Fetch all inventory IDs for this business
    const inventoryItems = await step.run("fetch-inventory-ids", async () => {
      return db.inventory.findMany({
        where: { businessId: business_id },
        select: { id: true },
      });
    });

    const itemIds = inventoryItems.map((item: any) => item.id);
    const batchSize = 50;
    const batches: string[][] = [];
    for (let i = 0; i < itemIds.length; i += batchSize) {
      batches.push(itemIds.slice(i, i + batchSize));
    }

    let processedCount = 0;

    // 2. Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batchIds = batches[i];
      await step.run(`process-batch-${i}`, async () => {
        // Run database queries within a 10s timeout transaction to prevent connection pool exhaustion
        await db.$transaction(
          async (tx: any) => {
            const items = await tx.inventory.findMany({
              where: { id: { in: batchIds } },
              select: {
                id: true,
                sku: true,
                productName: true,
                quantityOnHand: true,
                reorderLevel: true,
                unitCost: true,
                sellingPrice: true,
              },
            });

            for (const item of items) {
              const now = new Date();
              const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

              const [sales7d, sales30d, sales90d] = await Promise.all([
                tx.salesLineItem.findMany({
                  where: { inventoryId: item.id, createdAt: { gte: days7Ago } },
                  select: { quantity: true },
                }),
                tx.salesLineItem.findMany({
                  where: { inventoryId: item.id, createdAt: { gte: days30Ago } },
                  select: { quantity: true },
                }),
                tx.salesLineItem.findMany({
                  where: { inventoryId: item.id, createdAt: { gte: days90Ago } },
                  select: { quantity: true },
                }),
              ]);

              const total7d = sales7d.reduce((sum: number, s: any) => sum + s.quantity, 0);
              const total30d = sales30d.reduce((sum: number, s: any) => sum + s.quantity, 0);
              const total90d = sales90d.reduce((sum: number, s: any) => sum + s.quantity, 0);

              const velocity = {
                velocity_7d: total7d / 7,
                velocity_30d: total30d / 30,
                velocity_90d: total90d / 90,
              };

              const currentStock = item.quantityOnHand;
              const reorderLevel = item.reorderLevel;
              const unitCost = item.unitCost ? Number(item.unitCost) : 0;
              const sellingPrice = item.sellingPrice ? Number(item.sellingPrice) : 0;

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

                let urgency = "low";
                let riskLevel = "low";

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
                    ? new Date(Date.now() + (currentStock / avgVelocity) * 24 * 60 * 60 * 1000)
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

              // Save recommendations to database
              if (pricingRec) {
                await tx.aiPricingRecommendation.create({
                  data: {
                    businessId: business_id,
                    inventoryId: item.id,
                    currentPrice: sellingPrice,
                    recommendedPrice: pricingRec.recommended_price,
                    recommendedRangeMin: pricingRec.range_min,
                    recommendedRangeMax: pricingRec.range_max,
                    confidenceScore: pricingRec.confidence,
                    recommendationReason: "Automated pricing recommendation",
                    factors: {
                      velocity,
                      daysSupply: currentStock / Math.max(velocity.velocity_7d, 0.01),
                    } as any,
                    status: "pending",
                  },
                });
              }

              if (forecast) {
                await tx.inventoryForecast.create({
                  data: {
                    businessId: business_id,
                    inventoryId: item.id,
                    currentStock: currentStock,
                    velocity7d: velocity.velocity_7d,
                    velocity30d: velocity.velocity_30d,
                    velocity90d: velocity.velocity_90d,
                    velocityTrend:
                      velocity.velocity_7d > velocity.velocity_30d ? "accelerating" : "stable",
                    projectedStockoutDate: forecast.projected_stockout_date
                      ? new Date(forecast.projected_stockout_date)
                      : null,
                    daysUntilStockout: forecast.days_until_stockout,
                    recommendedRestockQuantity: forecast.recommended_restock,
                    restockUrgency: forecast.urgency,
                    inventoryRiskLevel: forecast.risk_level,
                    reasoning: "Automated inventory forecast",
                    confidenceScore: forecast.confidence,
                    forecastFactors: { velocity } as any,
                  },
                });
              }
            }
          },
          {
            maxWait: 10000, // 10 seconds max wait for connection pool
            timeout: 10000,  // 10 seconds execution timeout
          }
        );
        processedCount += batchIds.length;
      });
    }

    return { success: true, processedCount };
  }
);
