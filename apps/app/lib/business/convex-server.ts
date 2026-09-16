import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function businessClient(request?: Request | string) {
  const { businessId, userId } = await resolveAuthContext(request);
  if (!businessId || !userId) throw new Error("UNAUTHORIZED:");
  const token = await getConvexAuthToken();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, businessId, expectedUserId: userId };
}
export function businessFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const codes: Array<[string, number, string]> = [["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "You do not have permission to change these settings"], ["INVALID_ARGUMENT:", 400, "Invalid settings payload"], ["CONFLICT:", 409, "Settings changed. Reload before saving."], ["INVALID_STATE:", 503, "Business settings require reconciliation"], ["FEATURE_DISABLED:", 403, "These settings are currently unavailable"]];
  const match = codes.find(([code]) => message.includes(code));
  return NextResponse.json({ error: match?.[2] ?? "Business settings are temporarily unavailable" }, { status: match?.[1] ?? 503, headers: { "Cache-Control": "private, no-store" } });
}
