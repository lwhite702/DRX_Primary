import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { clerkClient } from "@/lib/adapters/auth/server";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { db } from "@/lib/db";

export type PlatformIdentityRemovalResult =
  | { success: true; code?: never; error?: never }
  | {
      success?: false;
      code: "FORBIDDEN" | "INVALID_TARGET" | "PROTECTED_TARGET" | "OWNER_CONFLICT" | "PROVIDER_FAILURE" | "LOCAL_FAILURE";
      error: string;
    };

function isNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

/**
 * Removes one global operator identity. Every caller uses this workflow so a
 * Clerk deletion, local PII mask, membership revocation, and audit outcome do
 * not drift between platform entry points.
 */
export async function removePlatformManagedIdentity(
  targetUserId: string,
  expectedBusinessId: string,
): Promise<PlatformIdentityRemovalResult> {
  const admin = await getPlatformAdmin();
  if (!admin) {
    return { code: "FORBIDDEN", error: "Global identity removal requires platform administration" };
  }
  if (!targetUserId || !expectedBusinessId || targetUserId === admin.userId) {
    return { code: "INVALID_TARGET", error: "Target is unavailable or protected" };
  }

  const [platformAccount, ownedBusiness, selectedMembership] = await Promise.all([
    db.adminUser.findFirst({ where: { userId: targetUserId }, select: { id: true } }),
    db.businessProfile.findFirst({ where: { ownerId: targetUserId }, select: { id: true } }),
    db.userRole.findFirst({
      where: { userId: targetUserId, businessId: expectedBusinessId },
      select: { id: true },
    }),
  ]);

  if (platformAccount) {
    return { code: "PROTECTED_TARGET", error: "Platform accounts cannot be removed here" };
  }
  if (ownedBusiness) {
    return {
      code: "OWNER_CONFLICT",
      error: "Transfer or close every owned business before removing this identity",
    };
  }
  if (!selectedMembership) {
    return { code: "INVALID_TARGET", error: "The selected business membership is unavailable" };
  }

  await db.systemAuditLog.create({
    data: {
      action: "rtbf_initiated",
      entityId: targetUserId,
      entityType: "user",
      userId: admin.userId,
      businessId: expectedBusinessId,
      newValues: { scope: "global_identity", status: "removal_initiated" },
    },
  });

  try {
    const client = await clerkClient();
    await client.users.deleteUser(targetUserId);
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.error("Identity provider deletion failed");
      return { code: "PROVIDER_FAILURE", error: "Identity provider removal failed; retry safely" };
    }
  }

  const anonymizedEmail = `deleted_${randomUUID().replaceAll("-", "")}@deleted.deelrxcrm.com`;
  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.updateMany({
        where: { OR: [{ clerkUserId: targetUserId }, { id: targetUserId }] },
        data: {
          clerkUserId: null,
          name: "DELETED_USER_RTBF",
          email: anonymizedEmail,
          status: "ARCHIVED",
        },
      });
      await tx.userRole.deleteMany({ where: { userId: targetUserId } });
      await tx.notification.deleteMany({ where: { userId: targetUserId } });
      await tx.systemAuditLog.create({
        data: {
          action: "rtbf_completed",
          entityId: targetUserId,
          entityType: "user",
          userId: admin.userId,
          businessId: expectedBusinessId,
          newValues: { scope: "global_identity", status: "completed" },
        },
      });
    });
  } catch {
    console.error("Local identity removal finalization failed");
    return { code: "LOCAL_FAILURE", error: "Local identity removal is incomplete; retry safely" };
  }

  return { success: true };
}

export function platformIdentityRemovalStatus(result: PlatformIdentityRemovalResult) {
  if (result.success) return 200;
  switch (result.code) {
    case "FORBIDDEN":
    case "PROTECTED_TARGET":
      return 403;
    case "INVALID_TARGET":
      return 400;
    case "OWNER_CONFLICT":
      return 409;
    case "PROVIDER_FAILURE":
      return 502;
    case "LOCAL_FAILURE":
      return 500;
  }
}
