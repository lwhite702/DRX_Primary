import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { intelligenceClient, headers, failure } from "../_lib/convex";
const schema = z.object({ business_id: z.string().min(1), request_id: z.string().trim().min(1).max(100), analysis_type: z.literal("all").default("all"), inventory_id: z.string().min(1).optional() });
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const body = parsed.data, { client, businessId, expectedUserId, productId } = await intelligenceClient(body.business_id, body.inventory_id);
    let summary;
    if (productId) {
      const result = await client.mutation(api.inventoryIntelligence.analyzeProduct, { businessId, expectedUserId, productId, requestId: body.request_id });
      summary = { total_analyzed: 1, pricing_generated: 1, forecasts_generated: 1, alerts_created: JSON.parse(result.resultJson).alerts.length, processed_count: 1, error_count: 0 };
    } else summary = await client.action(api.inventoryIntelligence.analyzeBatch, { businessId, expectedUserId, requestId: body.request_id });
    return NextResponse.json({ success: true, summary, timestamp: new Date().toISOString(), analysis_type: body.analysis_type }, { headers });
  } catch (error) { return failure(error); }
}
