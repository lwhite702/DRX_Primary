import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
const headers = { "Cache-Control": "private, no-store" };
const id = z.string().trim().min(1).max(200);
const integer = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const scope = z.object({ business_id: id, expectedUserId: id });
const payload = scope.extend({ enabled: z.boolean(), maxCustomerCents: integer, inventoryCapBps: integer.max(10000), newCustomerCents: integer, autoRefreshDays: integer.min(1).max(Math.floor(Number.MAX_SAFE_INTEGER / 86_400_000)), expectedRevision: integer.min(1).nullable(), requestKey: id }).strict();
async function connect(expectedUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED:");
  if (user.id !== expectedUserId) throw new Error("FORBIDDEN:");
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, expectedUserId: user.id };
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = [["UNAUTHENTICATED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "Access denied"], ["INVALID_ARGUMENT:", 400, "Invalid recommendation settings"], ["STALE_SETTINGS:", 409, "Settings changed. Reload before editing."], ["IDEMPOTENCY_CONFLICT:", 409, "Request conflicts with a saved change"], ["INVALID_STATE:", 409, "Settings require reconciliation"]].find(([code]) => message.includes(String(code)));
  return NextResponse.json({ error: match?.[2] ?? "Recommendation settings are temporarily unavailable", code: String(match?.[0] ?? "UNAVAILABLE:").replace(/:$/, "") }, { status: Number(match?.[1] ?? 503), headers });
}
export async function GET(request: NextRequest) {
  try {
    if (new Set(request.nextUrl.searchParams.keys()).size !== [...request.nextUrl.searchParams].length) throw new Error("INVALID_ARGUMENT:");
    const parsed = scope.strict().safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await connect(parsed.data.expectedUserId);
    const settings = await client.query(api.creditRecommendationSettings.read, { businessId: parsed.data.business_id, expectedUserId });
    return NextResponse.json({ settings }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const parsed = payload.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { business_id: businessId, expectedUserId: expected, ...values } = parsed.data;
    const { client, expectedUserId } = await connect(expected);
    const settings = await client.mutation(api.creditRecommendationSettings.save, { businessId, expectedUserId, ...values });
    return NextResponse.json({ settings }, { headers });
  } catch (error) { return failure(error); }
}
