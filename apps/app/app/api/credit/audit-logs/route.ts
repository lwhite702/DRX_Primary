import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
const headers = { "Cache-Control": "private, no-store" };
const id = z.string().trim().min(1).max(200);
const input = z.object({ business_id: id, customer_id: id.optional(), customerCreditId: id.optional(), expectedUserId: id.optional(), cursor: z.string().min(1).max(10000).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict().refine(value => value.customer_id || value.customerCreditId);
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("UNAUTHORIZED:");
    const params = request.nextUrl.searchParams;
    if (new Set(params.keys()).size !== [...params.keys()].length) throw new Error("INVALID_ARGUMENT:");
    const parsed = input.safeParse(Object.fromEntries(params));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    if (parsed.data.expectedUserId !== undefined && parsed.data.expectedUserId !== user.id) throw new Error("FORBIDDEN:");
    const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) throw new Error("UNAVAILABLE:");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const result = await client.query(api.creditAudit.page, { businessId: parsed.data.business_id, expectedUserId: user.id, customerId: parsed.data.customer_id, accountId: parsed.data.customerCreditId, paginationOpts: { cursor: parsed.data.cursor ?? null, numItems: parsed.data.limit } });
    return NextResponse.json(result, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const match = [["UNAUTHORIZED:", 401, "Unauthorized"], ["UNAUTHENTICATED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "Access denied"], ["NOT_FOUND:", 404, "Credit audit scope unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid credit audit request"], ["INVALID_STATE:", 409, "Credit audit requires reconciliation"]].find(([code]) => message.includes(String(code)));
    return NextResponse.json({ error: match?.[2] ?? "Credit audit is temporarily unavailable" }, { status: Number(match?.[1] ?? 503), headers });
  }
}
