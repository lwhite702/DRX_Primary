"use server";

import { getCurrentUserRole } from "@/lib/auth/server-guards";

export async function getUserRoleAction(businessId?: string) {
  try {
    const role = await getCurrentUserRole(businessId);
    return { role };
  } catch (error) {
    console.error("Error getting user role:", error);
    return { role: null, error: "Failed to fetch role" };
  }
}
