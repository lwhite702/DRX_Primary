import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intelligenceClient, headers, failure } from "../_lib/convex";
const schema = z.object({ business_id: z.string().min(1), request_id: z.string().trim().min(1).max(100), analysis_type: z.enum(["all", "pricing", "inventory"]).default("all"), margin_requirement: z.number().finite().min(0).max(10).default(0.3), supplier_lead_time_days: z.number().int().min(0).max(365).default(7) });
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const body = parsed.data, { client, businessId, expectedUserId } = await intelligenceClient(body.business_id);
    const result = await client.mutation(api.inventoryIntelligence.enqueueAnalysis, { businessId, expectedUserId, requestId: body.request_id, options: { analysisType: body.analysis_type, marginRequirement: body.margin_requirement, supplierLeadTimeDays: body.supplier_lead_time_days } });
    return NextResponse.json(result, { status: result.status === "complete" ? 200 : 202, headers });
  } catch (error) { return failure(error); }
}
export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("business_id"), jobId = request.nextUrl.searchParams.get("job_id");
    if (!requested || !jobId || jobId.length > 200) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId } = await intelligenceClient(requested);
    const result = await client.query(api.inventoryIntelligence.queuedStatus, { businessId, expectedUserId, runId: jobId as Id<"inventoryAnalysisRuns"> });
    return NextResponse.json(result, { headers });
  } catch (error) { return failure(error); }
}
