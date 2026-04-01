import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recommendationId } = await request.json();

    if (!recommendationId) {
      return NextResponse.json(
        { error: "Recommendation ID required" },
        { status: 400 },
      );
    }

    // Call the Postgres function
    const result: any[] = await db.$queryRaw`
      SELECT * FROM apply_ai_pricing_recommendation(${businessId}::uuid, ${recommendationId}::uuid)
    `;

    if (result && result.length > 0 && result[0].success) {
      return NextResponse.json({
        success: true,
        message: result[0].message,
        newPrice: result[0].new_price,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: result?.[0]?.message || "Failed to apply recommendation",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Apply AI Pricing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
