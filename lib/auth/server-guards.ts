import { createClient } from "@/lib/supabase/server";
import { Permission, Role } from "./permissions";
import { redirect } from "next/navigation";

export async function getCurrentUserRole(): Promise<Role | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Optimistic/Direct check if we have it in session/metadata?
  // For now, fetch from DB to be safe and authoritative

  // Try to use the helper function if available
  // const { data: role } = await supabase.rpc('auth.get_user_role');

  // Or query table directly
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (userRole?.role as Role) || null;
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Use the database RPC function for consistent enforcement
  const { data: hasPerm, error } = await supabase.rpc("check_permission", {
    required_permission: permission,
  });

  if (error) {
    console.error("Permission check failed:", error);
    return false;
  }

  return !!hasPerm;
}

export async function requirePermission(permission: Permission) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    // Return a structured error or redirect?
    // For server actions, throwing an error is often better handled by the client
    throw new Error(`Unauthorized: Missing permission ${permission}`);
  }
}

export async function requireRole(role: Role) {
  const currentRole = await getCurrentUserRole();
  if (currentRole !== role && currentRole !== "super_admin") {
    throw new Error(`Unauthorized: Requires role ${role}`);
  }
}

export async function protectRoute(permission: Permission) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    redirect("/login?error=unauthorized");
  }
}
