"use server";

import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Initiates the Right to be Forgotten (RTBF) deletion for a user.
 * This masks PII and removes tenant associations.
 */
export async function initiateRTBF(tenantId: string, userId: string) {
  const { userId: actorId } = await auth();

  if (!actorId) {
    return { error: "Not authenticated" };
  }

  try {
    // Check if actor is Owner of this tenant or Super Admin
    const roleData = await db.userRole.findFirst({
      where: {
        userId: actorId,
        businessId: tenantId,
      },
      select: { role: true },
    });

    const actorRole = roleData?.role?.toLowerCase() || "";
    let isAuthorized = ["owner", "super_admin"].includes(actorRole);

    if (!isAuthorized) {
      // Fallback check in admin_users
      const adminUser = await db.adminUser.findFirst({
        where: { userId: actorId },
        select: { role: true },
      });
      if (adminUser?.role === "super_admin") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        error: "Unauthorized: Only Owners or Super Admins can initiate RTBF",
      };
    }

    // 1. Audit Log Initiation
    await db.systemAuditLog.create({
      data: {
        action: "rtbf_initiated",
        entityId: userId,
        entityType: "user",
        userId: actorId,
        businessId: tenantId,
      },
    });

    // 2. Data Shredding / Masking local DB
    await db.user.update({
      where: { id: userId },
      data: {
        name: "DELETED_USER_RTBF",
        email: `deleted_${userId.substring(0, 8)}@deleted.deelrx.com`,
        status: "ARCHIVED",
      },
    });

    // 3. Role Removal
    await db.userRole.deleteMany({
      where: {
        userId,
        businessId: tenantId,
      },
    });

    // 4. Final Log
    await db.systemAuditLog.create({
      data: {
        action: "rtbf_completed",
        entityId: userId,
        entityType: "user",
        userId: actorId,
        businessId: tenantId,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    console.error("RTBF Action Error:", err);
    return { error: err.message || "Failed to initiate RTBF" };
  }
}
