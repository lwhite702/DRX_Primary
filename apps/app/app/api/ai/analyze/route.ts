import { NextRequest } from "next/server";
import { aiEngine, type ProductAnalysisRequest } from "@/lib/utils/ai-engine";
import { db } from "@/lib/db";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";

const AnalyzePayloadSchema = z.object({
  business_id: z.string().min(1),
  analysis_type: z.string().optional(),
  inventory_id: z.string().optional(),
});

type InventoryAnalysisRow = {
  id: string;
  sku: string;
  productName: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: unknown;
  sellingPrice: unknown;
};

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
    }) as InventoryAnalysisRow[];

    const requests: ProductAnalysisRequest[] = inventoryItems.map(
      (item) => ({
        businessId: business_id,
        inventoryId: item.id,
        productName: item.productName,
        sku: item.sku,
        cost: Number(item.unitCost || 0),
        currentPrice: Number(item.sellingPrice || 0),
        currentStock: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
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
