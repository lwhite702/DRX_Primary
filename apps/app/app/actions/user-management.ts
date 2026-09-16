"use server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { normalizeTeamRole } from "@/lib/team/roles";
import type { Role } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Platform operation on one business membership; never grants platform access. */
export async function updateUserRole(targetUserId: string, newRole: Role, businessId?: string) {
  try {
    const { userId } = await requirePlatformAdmin();
    const role = normalizeTeamRole(newRole);
    if (!role || !businessId) return { error: "A business and a supported business role are required" };
    const business = await db.businessProfile.findUnique({ where: { id: businessId }, select: { ownerId: true } });
    if (!business || business.ownerId === targetUserId) return { error: "Business ownership cannot be changed here" };
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.userRole.updateMany({
        where: { userId: targetUserId, businessId, role: { notIn: ["owner", "super_admin"] } },
        data: { role, permissions: {} },
      });
      if (!result.count) throw new Error("Membership unavailable");
      await tx.systemAuditLog.create({ data: {
        action: "platform_update_business_role", userId, businessId,
        entityType: "user_role", entityId: targetUserId, newValues: { role },
      } });
    });
    return { success: true };
  } catch { return { error: "Role update failed or platform access denied" }; }
}
