import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AnalysisRequest {
  business_id: string;
  analysis_type: "pricing" | "inventory" | "all";
  inventory_id?: string;
  margin_requirement?: number;
  supplier_lead_time_days?: number;
}

interface VelocityData {
  velocity_7d: number;
  velocity_30d: number;
  velocity_90d: number;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const { business_id, analysis_type = "all", inventory_id, margin_requirement = 0.3, supplier_lead_time_days = 7 }: AnalysisRequest = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get inventory items
    let query = supabase
      .from("inventory")
      .select("id, sku, product_name, quantity_on_hand, reorder_level, unit_cost, selling_price")
      .eq("business_id", business_id);

    if (inventory_id) {
      query = query.eq("id", inventory_id);
    }

    const { data: inventoryItems, error: inventoryError } = await query;

    if (inventoryError || !inventoryItems) {
      throw new Error(`Failed to fetch inventory: ${inventoryError?.message}`);
    }

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
          supabase
            .from("sales_line_items")
            .select("quantity")
            .eq("inventory_id", item.id)
            .gte("created_at", days7Ago.toISOString()),
          supabase
            .from("sales_line_items")
            .select("quantity")
            .eq("inventory_id", item.id)
            .gte("created_at", days30Ago.toISOString()),
          supabase
            .from("sales_line_items")
            .select("quantity")
            .eq("inventory_id", item.id)
            .gte("created_at", days90Ago.toISOString()),
        ]);

        const total7d = sales7d.data?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
        const total30d = sales30d.data?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
        const total90d = sales90d.data?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;

        const velocity = {
          velocity_7d: total7d / 7,
          velocity_30d: total30d / 30,
          velocity_90d: total90d / 90,
        };

        // Generate pricing recommendation
        let pricingRec = null;
        if (analysis_type === "pricing" || analysis_type === "all") {
          const cost = Number(item.unit_cost || 0);
          const currentPrice = Number(item.selling_price || 0);

          if (cost > 0) {
            const baselinePrice = cost * (1 + margin_requirement);
            let priceAdjustment = 1.0;

            // Inventory-based adjustment
            const avgVelocity = (velocity.velocity_7d + velocity.velocity_30d) / 2;
            const daysSupply = avgVelocity > 0 ? item.quantity_on_hand / avgVelocity : Infinity;

            if (daysSupply > 90) priceAdjustment *= 0.92;
            else if (daysSupply < 7) priceAdjustment *= 1.08;

            // Demand-based adjustment
            const recentTrend = ((velocity.velocity_7d - velocity.velocity_30d) / Math.max(velocity.velocity_30d, 0.01)) * 100;
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
          const avgVelocity = (velocity.velocity_7d + velocity.velocity_30d + velocity.velocity_90d) / 3;
          const daysSupply = avgVelocity > 0 ? item.quantity_on_hand / avgVelocity : Infinity;

          let urgency = "low";
          let riskLevel = "low";

          if (avgVelocity > 0) {
            if (daysSupply < 7) urgency = "critical";
            else if (daysSupply < 14) urgency = "high";
            else if (daysSupply < 30) urgency = "medium";
          } else {
            urgency = "low";
            riskLevel = item.quantity_on_hand > item.reorder_level * 2 ? "high" : "medium";
          }

          const recommendedRestock = Math.max(
            item.reorder_level,
            Math.ceil(avgVelocity * (45 - Math.min(daysSupply, 45)))
          );

          const stockoutDate = avgVelocity > 0
            ? new Date(Date.now() + (item.quantity_on_hand / avgVelocity) * 24 * 60 * 60 * 1000)
            : null;

          forecast = {
            projected_stockout_date: stockoutDate?.toISOString().split('T')[0],
            days_until_stockout: daysSupply === Infinity ? null : Math.floor(daysSupply),
            recommended_restock: recommendedRestock,
            urgency,
            risk_level: riskLevel,
            confidence: avgVelocity > 0 ? 80 : 40,
          };
        }

        // Save recommendations
        if (pricingRec) {
          const { error: savePricingError } = await supabase
            .from("ai_pricing_recommendations")
            .insert({
              business_id,
              inventory_id: item.id,
              current_price: Number(item.selling_price || 0),
              recommended_price: pricingRec.recommended_price,
              recommended_range_min: pricingRec.range_min,
              recommended_range_max: pricingRec.range_max,
              confidence_score: pricingRec.confidence,
              reasoning: "Automated pricing recommendation",
              factors: { velocity, daysSupply: item.quantity_on_hand / Math.max(velocity.velocity_7d, 0.01) },
              status: "pending",
            });

          if (savePricingError) console.error("Error saving pricing rec:", savePricingError);
        }

        if (forecast) {
          const { error: saveForecastError } = await supabase
            .from("inventory_forecasts")
            .insert({
              business_id,
              inventory_id: item.id,
              current_stock: item.quantity_on_hand,
              velocity_7d: velocity.velocity_7d,
              velocity_30d: velocity.velocity_30d,
              velocity_90d: velocity.velocity_90d,
              velocity_trend: velocity.velocity_7d > velocity.velocity_30d ? "accelerating" : "stable",
              projected_stockout_date: forecast.projected_stockout_date,
              days_until_stockout: forecast.days_until_stockout,
              recommended_restock_quantity: forecast.recommended_restock,
              restock_urgency: forecast.urgency,
              inventory_risk_level: forecast.risk_level,
              reasoning: "Automated inventory forecast",
              confidence_score: forecast.confidence,
              forecast_factors: { velocity },
            });

          if (saveForecastError) console.error("Error saving forecast:", saveForecastError);
        }

        results.push({
          inventory_id: item.id,
          sku: item.sku,
          product_name: item.product_name,
          pricing: pricingRec,
          forecast,
        });

        processedCount++;
      } catch (itemError) {
        console.error(`Error processing item ${item.sku}:`, itemError);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        error_count: errorCount,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Pricing Inventory Analysis Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
