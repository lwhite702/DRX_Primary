import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { intelligenceClient, headers, failure } from "../../ai/_lib/convex";
export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("businessId"), raw = request.nextUrl.searchParams.get("limit");
    const limit = raw === null ? 10 : Number(raw);
    if (!requested || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId } = await intelligenceClient(requested);
    const items = await client.query(api.inventoryIntelligence.pricingRecommendations, { businessId, expectedUserId, limit });
    return NextResponse.json({ items, data: items }, { headers });
  } catch (error) { return failure(error); }
}
