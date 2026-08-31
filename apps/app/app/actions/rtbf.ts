"use server";

import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Initiates the Right to be Forgotten (RTBF) deletion for a user.
 * This masks PII and removes tenant associations.
 */
export async function initiateRTBF(tenantId: string, userId: string) {
  const admin = await getPlatformAdmin();
  const actorId = admin?.userId;

  if (!actorId) {
    return { error: "Global identity removal requires platform administration. Business owners manage memberships in Business Team." };
  }

  try {
    const target = await db.userRole.findFirst({ where: { userId, businessId: tenantId }, select: { id: true } });
    if (!target || userId === actorId || await db.adminUser.findFirst({ where: { userId } })) {
      return { error: "Target is unavailable or protected" };
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

    revalidatePath("/control/[consoleKey]/users", "page");
    return { success: true };
  } catch {
    console.error("RTBF action failed");
    return { error: "Failed to initiate RTBF" };
  }
}
