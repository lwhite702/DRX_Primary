import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";
const headers = { "Cache-Control": "private, no-store" };
const id = z.string().trim().min(1).max(200);
const cents = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const scope = z.object({ business_id: id, customer_id: id, expectedUserId: id });
const change = scope.extend({ creditEnabled: z.boolean(), limitCents: cents, expectedCreditEnabled: z.boolean(), expectedLimitCents: cents, requestKey: id }).strict();
async function connection(expectedUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED:");
  if (user.id !== expectedUserId) throw new Error("FORBIDDEN:");
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, expectedUserId: user.id };
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = [["REQUEST_CANCELLED:", 409, "This request was cancelled before it was recorded."], ["UNAUTHORIZED:", 401, "Unauthorized"], ["UNAUTHENTICATED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "Access denied"], ["NOT_FOUND:", 404, "Credit account unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid credit policy request"], ["STALE_POLICY:", 409, "Credit policy changed. Refresh before making another change."], ["IDEMPOTENCY_CONFLICT:", 409, "This request was already used for a different policy change."], ["CONFLICT:", 409, "Credit policy request conflicts with a saved change."], ["INVALID_STATE:", 409, "Credit account requires reconciliation"]].find(([code]) => message.includes(String(code)));
  return NextResponse.json({ code: String(match?.[0] ?? "UNAVAILABLE:").replace(/:$/, ""), error: match?.[2] ?? "Credit policy is temporarily unavailable" }, { status: Number(match?.[1] ?? 503), headers });
}
export async function GET(request: NextRequest) {
  try {
    const parsed = scope.strict().safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await connection(parsed.data.expectedUserId);
    const result = await client.query(api.creditPolicy.read, { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId });
    return NextResponse.json(result, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const parsed = change.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await connection(parsed.data.expectedUserId);
    // Verify selected authority before checking the existing manual-override gates.
    const resolved = await client.query(api.creditPolicy.resolveScope, { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId });
    const args = { businessId: resolved.businessId, customerId: resolved.customerId, expectedUserId };
    for (const flag of [OPS_AVAILABILITY_FLAGS.creditApplyRecommendation, "feat_credit_overrides"]) {
      if (!await ensureServerFlag(flag, { distinctId: expectedUserId, personProperties: { business_id: args.businessId }, defaultValue: true })) return NextResponse.json({ code: "FEATURE_DISABLED", error: "Credit policy changes are temporarily disabled" }, { status: 503, headers });
    }
    const result = await client.mutation(api.creditPolicy.change, { ...args, creditEnabled: parsed.data.creditEnabled, limitCents: parsed.data.limitCents, expectedCreditEnabled: parsed.data.expectedCreditEnabled, expectedLimitCents: parsed.data.expectedLimitCents, requestKey: parsed.data.requestKey });
    return NextResponse.json({ ...result, requestKey: parsed.data.requestKey }, { headers });
  } catch (error) { return failure(error); }
}

/** Confirm a saved change or cancel an unrecorded request; no policy reversal. */
export async function DELETE(request: NextRequest) {
  try {
    const parsed = change.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await connection(parsed.data.expectedUserId);
    const result = await client.mutation(api.creditPolicy.cancel, { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId, creditEnabled: parsed.data.creditEnabled, limitCents: parsed.data.limitCents, expectedCreditEnabled: parsed.data.expectedCreditEnabled, expectedLimitCents: parsed.data.expectedLimitCents, requestKey: parsed.data.requestKey });
    return NextResponse.json(result, { headers });
  } catch (error) { return failure(error); }
}
