import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { intelligenceClient, headers, failure } from "../_lib/convex";
const schema = z.object({ business_id: z.string().min(1), inventory_id: z.string().min(1), request_id: z.string().trim().min(1).max(100), margin_requirement: z.number().finite().min(0).max(10).optional(), supplier_lead_time_days: z.number().int().min(0).max(365).optional(), min_price: z.number().finite().nonnegative().optional(), max_price: z.number().finite().nonnegative().optional(), restock_cost: z.number().finite().nonnegative().optional() });
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId, productId } = await intelligenceClient(parsed.data.business_id, parsed.data.inventory_id);
    if (!productId) throw new Error("NOT_FOUND:");
    const receipt = await client.mutation(api.inventoryIntelligence.analyzeProduct, { businessId, expectedUserId, productId, requestId: parsed.data.request_id, options: { marginRequirement: parsed.data.margin_requirement, supplierLeadTimeDays: parsed.data.supplier_lead_time_days, minPrice: parsed.data.min_price, maxPrice: parsed.data.max_price, restockCost: parsed.data.restock_cost } });
    const result = JSON.parse(receipt.resultJson);
    let insights = `${result.pricing?.reasoning || ""} ${result.forecast?.reasoning || ""}`.trim();
    if (process.env.OPENAI_API_KEY && result.pricing) {
      try {
        const { generatePricingInsightsWithAI } = await import("@/lib/ai/ai-sdk");
        const aiInsights = await generatePricingInsightsWithAI({
          productName: "Inventory Item",
          cost: result.pricing.factors?.cost ?? 0,
          currentPrice: result.pricing.factors?.currentPrice ?? result.pricing.recommendedPrice,
          currentStock: result.pricing.factors?.currentStock ?? 0,
          salesVelocity7d: result.velocity?.velocity7d ?? 0,
          salesVelocity30d: result.velocity?.velocity30d ?? 0,
          baselinePrice: result.pricing.recommendedPrice,
          baselineReasoning: result.pricing.reasoning,
        });
        if (aiInsights.reasoning) {
          insights = `${aiInsights.reasoning} ${result.forecast?.reasoning || ""}`.trim();
        }
      } catch {}
    }
    return NextResponse.json({ success: true, data: { pricing: result.pricing, forecast: result.forecast, pricingRecommendationId: receipt.analysisId, forecastId: receipt.analysisId, alerts: result.alerts, insights, lastUpdated: new Date(result.analyzedAt).toISOString() }, timestamp: new Date().toISOString() }, { headers });
  } catch (error) { return failure(error); }
}
export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("business_id"); if (!requested) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId } = await intelligenceClient(requested);
    const data = JSON.parse(await client.query(api.inventoryIntelligence.dashboard, { businessId, expectedUserId }));
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { headers });
  } catch (error) { return failure(error); }
}
