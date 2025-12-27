"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Role, Permission, ROLE_PERMISSIONS } from "@/lib/auth/permissions";

export function useUserRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
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

        // Check admin_users first (global admins)
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (adminUser) {
          setRole(adminUser.role as Role);
          setPermissions(ROLE_PERMISSIONS[adminUser.role as Role] || []);
          setLoading(false);
          return;
        }

        // Get selected business from localStorage (synced with useBusiness)
        const businessId = localStorage.getItem("selectedBusinessId");

        // Query role specifically for the selected business
        let query = supabase
          .from("user_roles")
          .select("role, permissions") // Assuming permissions can be overridden per user in future
          .eq("user_id", user.id);

        if (businessId) {
          query = query.eq("business_id", businessId);
        }

        const { data: userRoles, error } = await query;

        // Take the first role found (shoud be unique per business)
        const userRole = userRoles?.[0];

        if (error || !userRole) {
          // If no role found for this business (or no business selected), default to minimal access
          // Only log error if businessId was present but no role found
          if (businessId) {
            console.warn("No role found for selected business:", businessId);
          }
          setRole(null);
        } else {
          setRole(userRole.role as Role);
          // Combine static role permissions with any custom overrides (legacy support)
          setPermissions(ROLE_PERMISSIONS[userRole.role as Role] || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []); // Run once on mount, relies on page reload for context switch

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    // Super Admin has all permissions (optimistic check)
    if (role === "super_admin") return true;

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
