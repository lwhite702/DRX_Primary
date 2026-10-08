"use server";

import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { removePlatformManagedIdentity } from "@/lib/privacy/platform-identity-removal";
import { revalidatePath } from "next/cache";

/**
 * Initiates the Right to be Forgotten (RTBF) deletion for a user.
 * This masks PII and removes tenant associations.
 * Requires explicit platform administrator authority.
 */
export async function initiateRTBF(tenantId: string, userId: string) {
  try {
    const admin = await requirePlatformAdmin();
    const cleanTenantId = typeof tenantId === "string" ? tenantId.trim() : "";
    const cleanUserId = typeof userId === "string" ? userId.trim() : "";

    if (!cleanTenantId || !cleanUserId) {
      return { success: false as const, error: "Tenant and user identifiers are required", code: "INVALID_TARGET" as const };
    }

    if (cleanUserId === admin.userId) {
      return { success: false as const, error: "Target is unavailable or protected", code: "INVALID_TARGET" as const };
    }

    const result = await removePlatformManagedIdentity(cleanUserId, cleanTenantId);
    if (result.success) {
      revalidatePath("/control/[consoleKey]/users", "page");
      return { success: true as const };
    }
    return result;
  } catch {
    return { success: false as const, error: "Global identity removal requires platform administration", code: "FORBIDDEN" as const };
  }
}

