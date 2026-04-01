import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useUserRole } from "./use-user-role";

const getFallbackPermissions = (role: string | null): string[] => {
  if (!role) return [];

  // Normalize role
  const r = role.toLowerCase();

  const cashierPerms = [
    "sales.create",
    "sales.view_own",
    "catalog.view",
    "customers.view",
  ];

  const supervisorPerms = [
    ...cashierPerms,
    "sales.view_all",
    "sales.void",
    "sales.adjust",
    "sales.discount",
    "customers.manage",
    "reports.view_shift",
    "reports.view_daily",
  ];

  const managerPerms = [
    ...supervisorPerms,
    "inventory.manage",
    "reports.view_all",
    "settings.manage",
    "users.manage",
  ];

  if (r === "cashier" || r === "staff") return cashierPerms;
  if (r === "supervisor") return supervisorPerms;
  if (r === "manager" || r === "owner" || r === "admin") return managerPerms;
  if (r === "super_admin") return [...managerPerms, "system.config"]; // simplify

  return [];
};

export function usePermission(businessId: string | undefined) {
  const authBypassEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();
  const { role } = useUserRole(businessId);

  const fetchPermissions = useCallback(async () => {
    if (authBypassEnabled) {
      setPermissions(["*"]);
      setLoading(false);
      return;
    }

    if (!businessId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // Try to fetch from backend RPC
      const { data, error } = await supabase.rpc("get_user_permissions", {
        check_business_id: businessId,
      });

      if (error || !data) {
        // If RPC fails or returns no data (mock client), fallback to role-based mapping on client
        // This ensures the UI doesn't break during migration
        if (error)
          console.warn(
            "Error fetching permissions from RPC, falling back to role map:",
            error,
          );
        setPermissions(getFallbackPermissions(role));
      } else {
        setPermissions(data.map((d: any) => d.permission_slug));
      }
    } catch (err) {
      console.error("Error in usePermission:", err);
      setPermissions(getFallbackPermissions(role));
    } finally {
      setLoading(false);
    }
  }, [authBypassEnabled, businessId, supabase, role]);

  useEffect(() => {
    if (authBypassEnabled) {
      setPermissions(["*"]);
      setLoading(false);
      return;
    }

    if (role) {
      fetchPermissions();
    } else {
      setLoading(false);
    }
  }, [authBypassEnabled, fetchPermissions, role]);

  const hasPermission = useCallback(
    (requiredPermission: string) => {
      if (authBypassEnabled) return true;
      return permissions.includes(requiredPermission);
    },
    [authBypassEnabled, permissions],
  );

  return {
    permissions,
    loading,
    hasPermission,
    refreshPermissions: fetchPermissions,
  };
}
