import { NextRequest, NextResponse } from "next/server";
import { aiEngine, type ProductAnalysisRequest } from "@/lib/utils/ai-engine";
import { createAppClient } from "@/lib/data/client/supabase-client";

export async function POST(request: NextRequest) {
  try {
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
    } = await request.json();

    if (!business_id || !inventory_id) {
      return NextResponse.json(
        { error: "business_id and inventory_id are required" },
        { status: 400 }
      );
    }

    const analysisRequest: ProductAnalysisRequest = {
      businessId: business_id,
      inventoryId: inventory_id,
      productName: product_name,
      sku,
      cost: Number(cost || 0),
      currentPrice: Number(current_price || 0),
      currentStock: Number(current_stock || 0),
      reorderLevel: Number(reorder_level || 10),
      minPrice: min_price ? Number(min_price) : undefined,
      maxPrice: max_price ? Number(max_price) : undefined,
      supplierLeadTimeDays: Number(supplier_lead_time_days),
      restockCost: restock_cost ? Number(restock_cost) : undefined,
      marginRequirement: Number(margin_requirement),
    };

    const intelligence = await aiEngine.analyzeProduct(analysisRequest);

    return NextResponse.json({
      success: true,
      data: intelligence,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Product Intelligence Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const business_id = searchParams.get("business_id");

    if (!business_id) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    const intelligence = await aiEngine.getBusinessIntelligence(business_id);

    return NextResponse.json({
      success: true,
      data: intelligence,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Business Intelligence Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
