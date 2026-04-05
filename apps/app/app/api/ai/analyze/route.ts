import { NextRequest } from "next/server";
import { aiEngine, type ProductAnalysisRequest } from "@/lib/utils/ai-engine";
import { getSupabaseClient } from "@/lib/supabase/client";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";

const AnalyzePayloadSchema = z.object({
  business_id: z.string().min(1),
  analysis_type: z.string().optional(),
  inventory_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = AnalyzePayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid analysis payload",
        400,
        parsed.error.flatten(),
      );
    }
    const { business_id, analysis_type = "all", inventory_id } = parsed.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return errorResponse("INTERNAL_ERROR", "Supabase client not available", 500);
    }

    // Get inventory items
    let query = supabase
      .from("inventory")
      .select(
        "id, sku, product_name, quantity_on_hand, reorder_level, unit_cost, selling_price"
      )
      .eq("business_id", business_id);

    if (inventory_id) {
      query = query.eq("id", inventory_id);
    }

    const { data: inventoryItems, error: inventoryError } = await query;

    if (inventoryError || !inventoryItems) {
      return errorResponse(
        "INTERNAL_ERROR",
        `Failed to fetch inventory: ${inventoryError?.message}`,
        500,
      );
    }

    const requests: ProductAnalysisRequest[] = inventoryItems.map(
      (item: any) => ({
        businessId: business_id,
        inventoryId: item.id,
        productName: item.product_name,
        sku: item.sku,
        cost: Number(item.unit_cost || 0),
        currentPrice: Number(item.selling_price || 0),
        currentStock: item.quantity_on_hand,
        reorderLevel: item.reorder_level,
        marginRequirement: 0.3,
        supplierLeadTimeDays: 7,
      })
    );

    // Analyze in batch
    const results = await aiEngine.analyzeBatch(requests);

    const summary = {
      total_analyzed: results.size,
      pricing_generated: Array.from(results.values()).filter((r) => r.pricing)
        .length,
      forecasts_generated: Array.from(results.values()).filter(
        (r) => r.forecast
      ).length,
      alerts_created: Array.from(results.values()).reduce(
        (sum, r) => sum + r.alerts.length,
        0
      ),
      processed_count: results.size,
      error_count: 0,
    };

    return successResponse({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
      analysis_type,
    });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
