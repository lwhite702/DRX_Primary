import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface AnalysisRequest {
  business_id: string;
  analysis_type?: "pricing" | "inventory" | "all";
  inventory_id?: string;
  margin_requirement?: number;
  supplier_lead_time_days?: number;
}

type LogLevel = "info" | "error";

function jsonResponse(payload: Record<string, any>, status = 200) {
  return NextResponse.json(payload, { status });
}

function toErrorContext(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

function log(level: LogLevel, message: string, context: Record<string, any> = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });

  if (level === "error") {
    console.error(entry);
    return;
  }
  console.log(entry);
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  let body: AnalysisRequest | null = null;

  try {
    body = (await req.json()) as AnalysisRequest;
    const {
      business_id,
      analysis_type = "all",
      inventory_id,
      margin_requirement = 0.3,
      supplier_lead_time_days = 7,
    } = body;

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    // Get inventory items
    const inventoryItems = await db.inventory.findMany({
      where: {
        businessId: business_id,
        ...(inventory_id ? { id: inventory_id } : {}),
      },
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

    const results: any[] = [];
    let processedCount = 0;
    let errorCount = 0;

    for (const item of inventoryItems) {
      try {
        // Calculate velocity
        const now = new Date();
        const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const [sales7d, sales30d, sales90d] = await Promise.all([
          db.salesLineItem.findMany({
            where: {
              inventoryId: item.id,
              createdAt: { gte: days7Ago },
            },
            select: { quantity: true },
          }),
          db.salesLineItem.findMany({
            where: {
              inventoryId: item.id,
              createdAt: { gte: days30Ago },
            },
            select: { quantity: true },
          }),
          db.salesLineItem.findMany({
            where: {
              inventoryId: item.id,
              createdAt: { gte: days90Ago },
            },
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

            // Inventory-based adjustment
            const avgVelocity = (velocity.velocity_7d + velocity.velocity_30d) / 2;
            const daysSupply = avgVelocity > 0 ? currentStock / avgVelocity : Infinity;

            if (daysSupply > 90) priceAdjustment *= 0.92;
            else if (daysSupply < 7) priceAdjustment *= 1.08;

            // Demand-based adjustment
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

        // Save recommendations
        if (pricingRec) {
          await db.aiPricingRecommendation.create({
            data: {
              businessId: business_id,
              inventoryId: item.id,
              currentPrice: new Prisma.Decimal(sellingPrice),
              recommendedPrice: new Prisma.Decimal(pricingRec.recommended_price),
              recommendedRangeMin: new Prisma.Decimal(pricingRec.range_min),
              recommendedRangeMax: new Prisma.Decimal(pricingRec.range_max),
              confidenceScore: new Prisma.Decimal(pricingRec.confidence),
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
          await db.inventoryForecast.create({
            data: {
              businessId: business_id,
              inventoryId: item.id,
              currentStock: currentStock,
              velocity7d: new Prisma.Decimal(velocity.velocity_7d),
              velocity30d: new Prisma.Decimal(velocity.velocity_30d),
              velocity90d: new Prisma.Decimal(velocity.velocity_90d),
              velocityTrend: velocity.velocity_7d > velocity.velocity_30d ? "accelerating" : "stable",
              projectedStockoutDate: forecast.projected_stockout_date
                ? new Date(forecast.projected_stockout_date)
                : null,
              daysUntilStockout: forecast.days_until_stockout,
              recommendedRestockQuantity: forecast.recommended_restock,
              restockUrgency: forecast.urgency,
              inventoryRiskLevel: forecast.risk_level,
              reasoning: "Automated inventory forecast",
              confidenceScore: new Prisma.Decimal(forecast.confidence),
              forecastFactors: { velocity } as any,
            },
          });
        }

        results.push({
          inventory_id: item.id,
          sku: item.sku,
          product_name: item.productName,
          pricing: pricingRec,
          forecast,
        });

        processedCount++;
      } catch (itemError) {
        log("error", "Error processing inventory item", {
          requestId,
          sku: item.sku,
          inventory_id: item.id,
          error: toErrorContext(itemError),
        });
        errorCount++;
      }
    }

    return jsonResponse({
      success: true,
      processed_count: processedCount,
      error_count: errorCount,
      results,
    });
  } catch (error) {
    log("error", "AI pricing inventory analysis failed", {
      requestId,
      business_id: body?.business_id ?? null,
      error: toErrorContext(error),
    });

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
