import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
export const privateHeaders = { "Cache-Control": "private, no-store" };
export const identifier = z.string().trim().min(1).max(200);
export const scopeSchema = z.object({ business_id: identifier, customer_id: identifier, expectedUserId: identifier });
export async function recommendationConnection(expectedUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED:");
  if (user.id !== expectedUserId) throw new Error("FORBIDDEN:");
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, expectedUserId: user.id };
}
export async function recommendationFlags(flags: string[], expectedUserId: string, businessId: string) {
  for (const flag of flags) {
    if (!await ensureServerFlag(flag, { distinctId: expectedUserId, personProperties: { business_id: businessId }, defaultValue: true })) throw new Error("FEATURE_DISABLED:");
  }
}
export function recommendationFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const errors: [string, number, string][] = [
    ["UNAUTHENTICATED", 401, "Unauthorized"], ["FORBIDDEN", 403, "Access denied"],
    ["NOT_FOUND", 404, "Credit recommendation or customer unavailable"],
    ["INVALID_ARGUMENT", 400, "Invalid recommendation request"],
    ["STALE_RECOMMENDATION", 409, "Recommendation facts changed or expired. Generate a new recommendation."],
    ["STALE_SETTINGS", 409, "Recommendation settings changed or are unavailable."],
    ["INSUFFICIENT_HISTORY", 409, "Credit history requires reconciliation before a recommendation can be generated."],
    ["REQUEST_CANCELLED", 409, "This request was cancelled before it was recorded."],
    ["IDEMPOTENCY_CONFLICT", 409, "This request key belongs to another operation."],
    ["INVALID_STATE", 409, "Credit data requires reconciliation."],
    ["CAPACITY_EXCEEDED", 503, "Recommendation history exceeds the current supported capacity."],
    ["RATE_LIMITED", 429, "Recommendation request limit reached. Retry later."],
    ["FEATURE_DISABLED", 503, "Credit recommendations are temporarily disabled."],
  ];
  const match = errors.find(([code]) => message.includes(`${code}:`));
  return NextResponse.json({ code: match?.[0] ?? "UNAVAILABLE", error: match?.[2] ?? "Credit recommendations are temporarily unavailable." }, { status: match?.[1] ?? 503, headers: privateHeaders });
}
export function queryParameters(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => params.getAll(key).length !== 1)) throw new Error("INVALID_ARGUMENT:");
  return Object.fromEntries(params);
}
