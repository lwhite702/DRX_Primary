"use server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { normalizeTeamRole } from "@/lib/team/roles";
import type { Role } from "@/lib/auth/permissions";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

/** Platform operation on one business membership; never grants platform access. */
export async function updateUserRole(targetUserId: string, newRole: Role, businessId?: string) {
  try {
    const { userId } = await requirePlatformAdmin();
    const role = normalizeTeamRole(newRole);
    if (!role || !businessId) return { error: "A business and a supported business role are required" };
    const token = await getConvexAuthToken(); const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) return { error: "Role update failed or platform access denied" };
    const client = new ConvexHttpClient(url); client.setAuth(token);
    await client.mutation(api.platformAdmin.updateUserRole, { targetUserId, businessId, role });
    return { success: true };
  } catch { return { error: "Role update failed or platform access denied" }; }
}
