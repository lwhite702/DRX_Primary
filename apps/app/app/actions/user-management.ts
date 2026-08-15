"use server";

import { createLegacyServerDbClient as createServerDbClient } from "@/lib/data-access/server";
import { getCurrentUser } from "@/lib/adapters/auth";
import { Role } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

/**
 * Updates a user's role.
 * Requires the current user to be 'manager' or 'super_admin'.
 * Managers cannot assign 'super_admin'.
 */
export async function updateUserRole(targetUserId: string, newRole: Role) {
  const supabase = await createServerDbClient();
  const sessionUser = await getCurrentUser();

  if (!sessionUser?.id) {
    return { error: "Not authenticated" };
  }
  const user = sessionUser;

  // 1. Verify current user's role
  const { data: currentUserRoleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
    .single();

  const currentUserRole = currentUserRoleData?.role as Role;

  // Check valid admin
  if (currentUserRole !== "manager" && currentUserRole !== "super_admin") {
    // Allow if they are in admin_users table as super_admin (legacy/override)
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (adminUser?.role !== "super_admin") {
      return { error: "Unauthorized: Insufficient privileges" };
    }
  }

  // 2. Policy Checks
  // Manager cannot assign Super Admin
  if (currentUserRole === "manager" && newRole === "super_admin") {
    return { error: "Unauthorized: Managers cannot assign Super Admin role" };
  }

  // 3. Update the role
  const { error } = await supabase
    .from("user_roles")
    .update({ role: newRole })
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Error updating role:", error);
    return { error: "Failed to update role" };
  }

  // 4. Audit Log (Updated with business_id)
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("business_id")
    .eq("user_id", user.id)
    .single();

  await supabase.from("system_audit_log").insert({
    action: "update_user_role",
    entity_type: "user",
    entity_id: targetUserId,
    user_id: user.id,
    new_values: { role: newRole },
    business_id: roleData?.business_id,
  });

  revalidatePath("/admin/users");
  return { success: true };
}
