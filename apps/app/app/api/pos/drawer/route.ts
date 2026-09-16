import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
const schema = z.object({ requestId: z.string().uuid(), eventType: z.enum(["no_sale", "cash_drop", "payout", "audit", "refund"]).default("no_sale"), note: z.string().max(500).default("Drawer opened via API") });
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { client, ...context } = await businessClient(request);
    const payload = schema.safeParse(await request.json().catch(() => null));
    if (!payload.success) return NextResponse.json({ success: false, error: "Invalid drawer event" }, { status: 400, headers });
    return NextResponse.json(await client.mutation(api.drawer.record, { ...context, ...payload.data }), { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("UNAUTHORIZED:") ? 401 : message.includes("FORBIDDEN:") ? 403 : message.includes("CONFLICT:") ? 409 : 503;
    return NextResponse.json({ success: false, error: status === 409 ? "Drawer event changed. Retry the original request." : status === 401 ? "Unauthorized" : status === 403 ? "Checkout permission is required" : "Drawer event could not be confirmed. Retry the same request." }, { status, headers });
  }
}
