import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { api } from "@/convex/_generated/api";
export const headers = { "Cache-Control": "private, no-store" };
export async function intelligenceClient(businessId: string, productId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED:");
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  const scope = await client.query(api.inventoryIntelligence.resolveScope, { businessId, productId, expectedUserId: user.id });
  return { client, expectedUserId: user.id, ...scope };
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = [["STALE_PRICE:", 409, "Product price changed. Generate a new analysis."], ["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "Access denied"], ["NOT_FOUND:", 404, "Item unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid intelligence request"], ["CONFLICT:", 409, "Analysis retry changed"], ["CAPACITY_EXCEEDED:", 503, "Analysis volume exceeds the current processing limit"]].find(([code]) => message.includes(String(code)));
  return NextResponse.json({ error: match?.[2] ?? "Intelligence is temporarily unavailable. Retry the same request." }, { status: Number(match?.[1] ?? 503), headers });
}
