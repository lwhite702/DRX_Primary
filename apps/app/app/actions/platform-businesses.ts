"use server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPlatformBusinesses } from "@/lib/platform/queries";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function fetchPlatformBusinesses() {
  try {
    const rows = await getPlatformBusinesses();
    return { data: rows.map((row) => ({
      id: row.id, business_name: row.businessName, business_type: row.businessType,
      is_active: row.isActive, created_at: row.createdAt.toISOString(),
    })) };
  } catch { return { data: [], error: "Business registry unavailable or access denied" }; }
}

export async function setPlatformBusinessActive(businessId: string, active: boolean) {
  try {
    const { userId } = await requirePlatformAdmin();
    if (!businessId || typeof active !== "boolean") return { error: "Invalid business update" };
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.businessProfile.update({ where: { id: businessId }, data: { isActive: active } });
      await tx.systemAuditLog.create({ data: {
        userId, entityType: "business", entityId: businessId,
        action: "platform_business_status_changed", newValues: { isActive: active },
      } });
    });
    return { success: true };
  } catch { return { error: "Business update failed or access denied" }; }
}
