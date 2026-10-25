import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import {
  isAuthBypassEnabledServer,
  getBypassAuthUserId,
  getBypassAuthOrgId,
} from "@/lib/auth/bypass";
import { isNoClerkPreviewEnvironment } from "@/lib/adapters/auth/server";

function hasPreviewBypassHeaders(headers: { get(name: string): string | null }): boolean {
  const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const bypassHeader = headers.get("x-vercel-protection-bypass")?.trim();
  if (vercelBypassSecret && bypassHeader === vercelBypassSecret) {
    return true;
  }
  const previewSecret = process.env.PREVIEW_TEST_SECRET?.trim();
  const previewHeader = headers.get("x-preview-test-token")?.trim();
  if (previewSecret && previewHeader === previewSecret) {
    return true;
  }
  return false;
}

async function isAuthorizedPreviewTestSession(request?: Request | string): Promise<boolean> {
  if (!isNoClerkPreviewEnvironment()) return false;
  if (isAuthBypassEnabledServer()) return true;

  if (typeof request === "object" && request && "headers" in request) {
    return hasPreviewBypassHeaders(request.headers);
  }

  // When request is not passed (e.g. server components or routes calling resolveAuthContext()),
  // attempt to read headers from Next.js server context if available.
  try {
    const { headers } = await import("next/headers");
    return hasPreviewBypassHeaders(await headers());
  } catch {
    // Outside Next.js request context
  }

  return false;
}

async function businessContext(selectedBusinessId?: string) {
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
  if (isAuthBypassEnabledServer()) return true;
  if (isNoClerkPreviewEnvironment()) {
    const allowedOrg = process.env.BYPASS_AUTH_ORG_ID || "preview_org";
    const allowedUser = process.env.BYPASS_AUTH_USER_ID || "preview_tester";
    return userId === allowedUser && businessId === allowedOrg;
  }
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
  if (isAuthBypassEnabledServer()) {
    return {
      userId: getBypassAuthUserId(),
      businessId: selectedBusinessId || getBypassAuthOrgId(),
    };
  }
  if (await isAuthorizedPreviewTestSession(request)) {
    return {
      userId: process.env.BYPASS_AUTH_USER_ID || "preview_tester",
      businessId: process.env.BYPASS_AUTH_ORG_ID || "preview_org",
    };
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
