"use server";

import { removePlatformManagedIdentity } from "@/lib/privacy/platform-identity-removal";
import { revalidatePath } from "next/cache";

/**
 * Initiates the Right to be Forgotten (RTBF) deletion for a user.
 * This masks PII and removes tenant associations.
 */
export async function initiateRTBF(tenantId: string, userId: string) {
  const result = await removePlatformManagedIdentity(userId, tenantId);
  if (result.success) revalidatePath("/control/[consoleKey]/users", "page");
  return result;
}
