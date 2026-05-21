import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface InventoryHealthRequest {
  business_id: string;
}

type LogLevel = "info" | "error";

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getMissingRequiredEnv(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
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

function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
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

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const missingEnvs = getMissingRequiredEnv();
  if (missingEnvs.length > 0) {
    const message = `Missing required environment variables: ${missingEnvs.join(", ")}`;
    log("error", message, { requestId, missing_envs: missingEnvs });
    return jsonResponse({ success: false, error: message }, 500);
  }

  let body: InventoryHealthRequest | null = null;

  try {
    body = (await req.json()) as InventoryHealthRequest;
    const { business_id } = body;

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);

    // Fetch inventory data
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .select(
        "id, product_name, sku, quantity_on_hand, reorder_level, unit_cost, selling_price"
      )
      .eq("business_id", business_id);

    if (inventoryError) throw inventoryError;

    // Fetch recent sales for demand forecasting
    const { data: recentSales, error: salesError } = await supabase
      .from("sales_line_items")
      .select("inventory_id, quantity, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .in(
        "sale_id",
        (
          await supabase
            .from("sales")
            .select("id")
            .eq("business_id", business_id)
            .gte(
              "created_at",
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            )
        ).data?.map((s) => s.id) || []
      );

    if (salesError) throw salesError;

    // Calculate metrics
    const lowStockItems = (inventory || []).filter(
      (item) => item.quantity_on_hand <= item.reorder_level
    );
    const outOfStockItems = (inventory || []).filter(
      (item) => item.quantity_on_hand === 0
    );
    const totalInventoryValue = (inventory || []).reduce(
      (sum, item) => sum + item.quantity_on_hand * Number(item.unit_cost || 0),
      0
    );

    // Calculate demand per item
    const demandMap = new Map<string, number>();
    (recentSales || []).forEach((sale) => {
      const current = demandMap.get(sale.inventory_id) || 0;
      demandMap.set(sale.inventory_id, current + sale.quantity);
    });

    // Generate reorder predictions
    const reorderPredictions = (inventory || []).map((item) => {
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

Total items: ${inventory?.length || 0}
Low stock items: ${lowStockItems.length}
Out of stock items: ${outOfStockItems.length}
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
            await supabase.from("ai_insights").insert({
              business_id,
              insight_type: "inventory",
              insight_title:
                aiInsight.insight_title || "Inventory Health Analysis",
              insight_content: aiInsight.insight_content || content,
              priority: aiInsight.priority || "medium",
              action_recommended: aiInsight.action_recommended || "",
              status: "pending",
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
        total_items: inventory?.length || 0,
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
      const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);
      await supabase.from("ai_insights_failures").insert({
        business_id: body?.business_id ?? null,
        function_name: "inventory_health",
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
        input_data: body,
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
      500,
    );
  }
});
