"use server";

import { createClient } from "@/lib/supabase/server";
import { Role, ROLES } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

/**
 * Updates a user's role.
 * Requires the current user to be 'manager' or 'super_admin'.
 * Managers cannot assign 'super_admin'.
 */
export async function updateUserRole(targetUserId: string, newRole: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

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

  // 4. Audit Log (Optional but recommended)
  await supabase.from("system_audit_log").insert({
    action: "update_user_role",
    entity_type: "user",
    entity_id: targetUserId,
    user_id: user.id,
    new_values: { role: newRole },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
