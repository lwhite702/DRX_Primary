import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intelligenceClient, headers, failure } from "../_lib/convex";
const severity = z.enum(["low", "medium", "high", "critical"]);
const acknowledge = z.object({ action: z.literal("acknowledge"), alert_id: z.string().min(1).max(200), business_id: z.string().min(1) });
export async function POST(request: NextRequest) {
  try {
    const parsed = acknowledge.safeParse(await request.json().catch(() => null)); if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId } = await intelligenceClient(parsed.data.business_id);
    const result = await client.mutation(api.inventoryIntelligence.acknowledgeAlert, { businessId, expectedUserId, alertId: parsed.data.alert_id as Id<"inventoryIntelligenceAlerts"> });
    return NextResponse.json(result, { headers });
  } catch (error) { return failure(error); }
}
export async function GET(request: NextRequest) {
  try {
    const requested = request.nextUrl.searchParams.get("business_id"); if (!requested) throw new Error("INVALID_ARGUMENT:");
    const raw = request.nextUrl.searchParams.get("severity"), parsed = severity.optional().safeParse(raw ?? undefined);
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId } = await intelligenceClient(requested);
    const data = await client.query(api.inventoryIntelligence.unreadAlerts, { businessId, expectedUserId, severity: parsed.data });
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error) { return failure(error); }
}
