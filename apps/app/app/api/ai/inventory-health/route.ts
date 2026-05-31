import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

interface InventoryHealthRequest {
  business_id: string;
}

interface MappedInventoryItem {
  id: string;
  product_name: string;
  sku: string;
  quantity_on_hand: number;
  reorder_level: number;
  unit_cost: number;
  selling_price: number;
}

interface MappedSaleItem {
  inventory_id: string | null;
  quantity: number;
  created_at: string;
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
  let body: InventoryHealthRequest | null = null;

  try {
    body = (await req.json()) as InventoryHealthRequest;
    const { business_id } = body;

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    // Fetch inventory data
    const inventory = await db.inventory.findMany({
      where: { businessId: business_id },
      select: {
        id: true,
        productName: true,
        sku: true,
        quantityOnHand: true,
        reorderLevel: true,
        unitCost: true,
        sellingPrice: true,
      },
    });

    const mappedInventory: MappedInventoryItem[] = (inventory as any[]).map((item) => ({
      id: item.id,
      product_name: item.productName,
      sku: item.sku,
      quantity_on_hand: item.quantityOnHand,
      reorder_level: item.reorderLevel,
      unit_cost: item.unitCost ? Number(item.unitCost) : 0,
      selling_price: item.sellingPrice ? Number(item.sellingPrice) : 0,
    }));

    // Fetch recent sales for demand forecasting
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentSales = await db.salesLineItem.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        sale: {
          businessId: business_id,
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      select: {
        inventoryId: true,
        quantity: true,
        createdAt: true,
      },
    });

    const mappedRecentSales: MappedSaleItem[] = (recentSales as any[]).map((item) => ({
      inventory_id: item.inventoryId,
      quantity: item.quantity,
      created_at: item.createdAt.toISOString(),
    }));

    // Calculate metrics
    const lowStockItems = mappedInventory.filter(
      (item) => item.quantity_on_hand <= item.reorder_level
    );
    const outOfStockItems = mappedInventory.filter(
      (item) => item.quantity_on_hand === 0
    );
    const totalInventoryValue = mappedInventory.reduce(
      (sum, item) => sum + item.quantity_on_hand * Number(item.unit_cost || 0),
      0
    );

    // Calculate demand per item
    const demandMap = new Map<string, number>();
    mappedRecentSales.forEach((sale) => {
      if (sale.inventory_id) {
        const current = demandMap.get(sale.inventory_id) || 0;
        demandMap.set(sale.inventory_id, current + sale.quantity);
      }
    });

    // Generate reorder predictions
    const reorderPredictions = mappedInventory.map((item) => {
      const demand30Days = demandMap.get(item.id) || 0;
      const dailyDemand = demand30Days / 30;
      const daysUntilReorder =
        dailyDemand > 0 ? item.quantity_on_hand / dailyDemand : Infinity;
      const shouldReorder =
        item.quantity_on_hand <= item.reorder_level || daysUntilReorder < 7;

      return {
        inventory_id: item.id,
        product_name: item.product_name,
        current_stock: item.quantity_on_hand,
        reorder_level: item.reorder_level,
        estimated_days_until_stockout: daysUntilReorder,
        should_reorder: shouldReorder,
        recommended_quantity: shouldReorder
          ? Math.max(item.reorder_level * 2, demand30Days)
          : 0,
      };
    });

    // Generate AI insights if OpenAI is configured
    let aiInsight = null;
    if (OPENAI_API_KEY) {
      try {
        const prompt = `Analyze this inventory health data:

Total items: ${mappedInventory.length}
Low stock items: ${lowStockItems.length}
OutOfStock items: ${outOfStockItems.length}
Total inventory value: $${totalInventoryValue.toFixed(2)}

Low stock items:
${lowStockItems
  .map(
    (item) =>
      `- ${item.product_name}: ${item.quantity_on_hand} (reorder at ${item.reorder_level})`
  )
  .join("\n")}

Provide a JSON response with:
- insight_title: Brief title
- insight_content: Analysis of inventory health and recommendations
- priority: "low", "medium", "high", or "critical"
- action_recommended: Specific reorder recommendations

Focus on items that need immediate attention.`;

        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an inventory management expert. Respond with valid JSON only.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 800,
            }),
          }
        );

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const content = openaiData.choices[0]?.message?.content;
          if (content) {
            const jsonMatch =
              content.match(/```json\s*([\s\S]*?)\s*```/) ||
              content.match(/```\s*([\s\S]*?)\s*```/);
            aiInsight = JSON.parse(jsonMatch ? jsonMatch[1] : content);

            // Store insight
            await db.aiInsight.create({
              data: {
                businessId: business_id,
                insightType: "inventory",
                insightTitle: aiInsight.insight_title || "Inventory Health Analysis",
                insightContent: aiInsight.insight_content || content,
                priority: aiInsight.priority || "medium",
                actionRecommended: aiInsight.action_recommended || "",
                status: "pending",
              },
            });
          }
        }
      } catch (aiError) {
        log("error", "Inventory health AI insight generation failed", {
          requestId,
          error: toErrorContext(aiError),
        });
      }
    }

    return jsonResponse({
      success: true,
      metrics: {
        total_items: mappedInventory.length,
        low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStockItems.length,
        total_inventory_value: totalInventoryValue,
      },
      low_stock_items: lowStockItems.map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity_on_hand: item.quantity_on_hand,
        reorder_level: item.reorder_level,
      })),
      reorder_predictions: reorderPredictions.filter((p) => p.should_reorder),
      ai_insight: aiInsight,
    });
  } catch (error) {
    log("error", "Inventory health function failed", {
      requestId,
      error: toErrorContext(error),
    });

    // Log failure
    try {
      await db.aiInsightFailure.create({
        data: {
          businessId: body?.business_id ?? null,
          functionName: "inventory_health",
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          inputData: body as any,
        },
      });
    } catch (logError) {
      log("error", "Failed to write ai_insights_failures log", {
        requestId,
        error: toErrorContext(logError),
      });
    }

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
