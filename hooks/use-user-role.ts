"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Role, Permission, ROLE_PERMISSIONS } from "@/lib/auth/permissions";

export function useUserRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          return;
        }

        const { data: userRole, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error || !userRole) {
          console.error("Error fetching role:", error);
          setRole("cashier"); // Default fallback? Or null?
        } else {
          setRole(userRole.role as Role);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    // Super Admin has all permissions (optimistic check)
    if (role === "super_admin") return true;

    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  };

  return {
    role,
    loading,
    hasPermission,
    checkPermission: hasPermission, // Alias
    isAdmin: role === "manager" || role === "super_admin",
  };
}
