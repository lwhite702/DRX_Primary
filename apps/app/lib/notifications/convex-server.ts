import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
export const notificationHeaders = { "Cache-Control": "private, no-store" };
export async function notificationClient() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED:");
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, expectedUserId: user.id };
}
export function notificationFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const entries: Array<[string, number, string]> = [["UNAUTHORIZED:",401,"Unauthorized"],["FORBIDDEN:",403,"Forbidden"],["INVALID_ARGUMENT:",400,"Invalid notification request"],["CONFLICT:",409,"Notification request changed. Reload or retry the original request."],["FEATURE_DISABLED:",503,"Notification writes are temporarily disabled"]];
  const match = entries.find(([code]) => message.includes(code));
  return NextResponse.json({ error: match?.[2] ?? "Notifications are temporarily unavailable" }, { status: match?.[1] ?? 503, headers: notificationHeaders });
}
