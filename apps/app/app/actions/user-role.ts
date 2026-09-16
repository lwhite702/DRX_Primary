"use server";

import { auth } from "@/lib/adapters/auth/server";
import { getCurrentUserRole } from "@/lib/auth/server-guards";
import { z } from "zod";

const businessIdSchema = z.string().trim().min(1).max(255).optional();

export async function getUserRoleAction(businessId?: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { role: null, error: "UNAUTHORIZED" };
    }

    const parseResult = businessIdSchema.safeParse(businessId);
    if (!parseResult.success) {
      return { role: null, error: "INVALID_ARGUMENT: Invalid businessId format" };
    }

    const role = await getCurrentUserRole(parseResult.data);
    return { role };
  } catch (error) {
    console.error("Error getting user role:", error);
    return { role: null, error: "Failed to fetch role" };
  }
}
