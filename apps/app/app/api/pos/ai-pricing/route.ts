import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    // Call the Postgres function
    const recommendations = await db.$queryRaw`
      SELECT * FROM get_ai_pricing_recommendations(${businessId}::uuid, ${limit})
    `;

    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error("AI Pricing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
