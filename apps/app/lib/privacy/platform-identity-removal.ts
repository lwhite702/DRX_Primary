import "server-only";
import { randomUUID } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { clerkClient } from "@/lib/adapters/auth/server";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { api } from "@/convex/_generated/api";

export type PlatformIdentityRemovalResult =
  | { success: true; code?: never; error?: never }
  | { success?: false; code: "FORBIDDEN" | "INVALID_TARGET" | "PROTECTED_TARGET" | "OWNER_CONFLICT" | "PROVIDER_FAILURE" | "LOCAL_FAILURE"; error: string };

function isNotFoundError(error: unknown) { return typeof error === "object" && error !== null && "status" in error && error.status === 404; }

export async function removePlatformManagedIdentity(targetUserId: string, expectedBusinessId: string): Promise<PlatformIdentityRemovalResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { code: "FORBIDDEN", error: "Global identity removal requires platform administration" };
  if (!targetUserId || !expectedBusinessId || targetUserId === admin.userId) return { code: "INVALID_TARGET", error: "Target is unavailable or protected" };
  const token = await getConvexAuthToken(); const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) return { code: "LOCAL_FAILURE", error: "Convex identity removal is unavailable; retry safely" };
  const convex = new ConvexHttpClient(url); convex.setAuth(token);
  try { await convex.query(api.platformAdmin.validateIdentityRemoval, { targetUserId, businessId: expectedBusinessId }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("PROTECTED_TARGET")) return { code: "PROTECTED_TARGET", error: "Platform accounts cannot be removed here" };
    if (message.includes("OWNER_CONFLICT")) return { code: "OWNER_CONFLICT", error: "Transfer or close every owned business before removing this identity" };
    return { code: "INVALID_TARGET", error: "The selected business membership is unavailable" };
  }
  try {
    const client = await clerkClient(); await client.users.deleteUser(targetUserId);
  } catch (error) {
    if (!isNotFoundError(error)) return { code: "PROVIDER_FAILURE", error: "Identity provider removal failed; retry safely" };
  }
  try {
    await convex.mutation(api.platformAdmin.removeIdentity, { targetUserId, businessId: expectedBusinessId, anonymizedUserId: `deleted_${randomUUID()}`, anonymizedEmail: `deleted_${randomUUID().replaceAll("-", "")}@deleted.deelrxcrm.com` });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("PROTECTED_TARGET")) return { code: "PROTECTED_TARGET", error: "Platform accounts cannot be removed here" };
    if (message.includes("OWNER_CONFLICT")) return { code: "OWNER_CONFLICT", error: "Transfer or close every owned business before removing this identity" };
    if (message.includes("INVALID_TARGET")) return { code: "INVALID_TARGET", error: "The selected business membership is unavailable" };
    console.error("Local identity removal finalization failed"); return { code: "LOCAL_FAILURE", error: "Local identity removal is incomplete; retry safely" };
  }
}

export function platformIdentityRemovalStatus(result: PlatformIdentityRemovalResult) {
  if (result.success) return 200;
  switch (result.code) { case "FORBIDDEN": case "PROTECTED_TARGET": return 403; case "INVALID_TARGET": return 400; case "OWNER_CONFLICT": return 409; case "PROVIDER_FAILURE": return 502; case "LOCAL_FAILURE": return 500; }
}
