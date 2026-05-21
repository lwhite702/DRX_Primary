import { NextRequest } from "next/server";
import { aiEngine, type ProductAnalysisRequest } from "@/lib/utils/ai-engine";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";

const ProductIntelligenceSchema = z.object({
  business_id: z.string().min(1),
  inventory_id: z.string().min(1),
  product_name: z.string().optional(),
  sku: z.string().optional(),
  cost: z.coerce.number().finite().optional(),
  current_price: z.coerce.number().finite().optional(),
  current_stock: z.coerce.number().finite().optional(),
  reorder_level: z.coerce.number().finite().optional(),
  min_price: z.coerce.number().finite().optional(),
  max_price: z.coerce.number().finite().optional(),
  supplier_lead_time_days: z.coerce.number().finite().optional(),
  restock_cost: z.coerce.number().finite().optional(),
  margin_requirement: z.coerce.number().finite().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = ProductIntelligenceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid product intelligence payload",
        400,
        parsed.error.flatten(),
      );
    }

    const {
      business_id,
      inventory_id,
      product_name,
      sku,
      cost,
      current_price,
      current_stock,
      reorder_level,
      min_price,
      max_price,
      supplier_lead_time_days = 7,
      restock_cost,
      margin_requirement = 0.3,
    } = parsed.data;

    const analysisRequest: ProductAnalysisRequest = {
      businessId: business_id,
      inventoryId: inventory_id,
      productName: product_name ?? "",
      sku: sku ?? "",
      cost: cost ?? 0,
      currentPrice: current_price ?? 0,
      currentStock: current_stock ?? 0,
      reorderLevel: reorder_level ?? 10,
      minPrice: min_price,
      maxPrice: max_price,
      supplierLeadTimeDays: supplier_lead_time_days,
      restockCost: restock_cost,
      marginRequirement: margin_requirement,
    };

    const intelligence = await aiEngine.analyzeProduct(analysisRequest);

    return successResponse({
      success: true,
      data: intelligence,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Product Intelligence Error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const business_id = searchParams.get("business_id");

    if (!business_id) {
      return errorResponse("BAD_REQUEST", "business_id is required", 400);
    }

    const intelligence = await aiEngine.getBusinessIntelligence(business_id);

    return successResponse({
      success: true,
      data: intelligence,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Business Intelligence Error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}
