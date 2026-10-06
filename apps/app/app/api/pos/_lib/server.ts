import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

async function businessContext(selectedBusinessId?: string) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return {
      userId: process.env.BYPASS_AUTH_USER_ID || "user_required_ux",
      businessId: selectedBusinessId || process.env.BYPASS_AUTH_ORG_ID || "org_required_ux",
    };
  }
  const token = await getConvexAuthToken();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new Error("Business service is temporarily unavailable");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  try {
    return await client.query(api.session.currentBusiness, { selectedBusinessId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (["FORBIDDEN:", "UNAUTHORIZED:", "UNAUTHENTICATED:", "NOT_FOUND:"].some(code => message.includes(code))) return null;
    throw new Error("Business service is temporarily unavailable");
  }
}

export async function assertBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  const context = await businessContext(businessId);
  return context?.userId === userId;
}

export async function resolveAuthContext(request?: Request | string) {
  let selectedBusinessId: string | undefined;
  if (typeof request === "string") selectedBusinessId = request;
  else if (request) {
    const url = new URL(request.url);
    selectedBusinessId = request.headers.get("x-business-id") || url.searchParams.get("businessId") || url.searchParams.get("business_id") || undefined;
  }
  const context = await businessContext(selectedBusinessId);
  return { userId: context?.userId ?? null, businessId: context?.businessId ?? null };
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}
