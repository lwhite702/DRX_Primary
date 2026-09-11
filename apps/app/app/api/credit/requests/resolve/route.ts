import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
const headers = { "Cache-Control": "private, no-store" };
const input = z.object({ business_id: z.string().min(1).max(200), customer_id: z.string().min(1).max(200), expectedUserId: z.string().min(1).max(200), requestKey: z.string().min(1).max(200) }).strict();
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid credit request" }, { status: 400, headers });
    if (parsed.data.expectedUserId !== user.id) throw new Error("FORBIDDEN:");
    const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) throw new Error("UNAVAILABLE:");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const result = await client.mutation(api.credit.resolvePendingRequest, { customerId: parsed.data.customer_id as Id<"customers">, businessId: parsed.data.business_id, expectedUserId: user.id, requestKey: parsed.data.requestKey });
    return NextResponse.json({ ...result, customerId: parsed.data.customer_id, requestKey: parsed.data.requestKey, operatorId: user.id }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("FORBIDDEN:") ? 403 : message.includes("NOT_FOUND:") ? 404 : message.includes("IDEMPOTENCY_CONFLICT:") ? 409 : 503;
    return NextResponse.json({ error: "Credit request could not be resolved. Keep the pending request and retry." }, { status, headers });
  }
}
