import { useCallback, useMemo } from "react";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";
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
  const authBypassEnabled = useIsBypassActive();
  const {
    role,
    roleBusinessId,
    loading: roleLoading,
    refreshRole,
  } = useUserRole(businessId);
  const roleMatchesBusiness = roleBusinessId === businessId;
  const permissions = useMemo(
    () =>
      authBypassEnabled
        ? ["*"]
        : getFallbackPermissions(roleMatchesBusiness ? role : null),
    [authBypassEnabled, role, roleMatchesBusiness],
  );

  const hasPermission = useCallback(
    (requiredPermission: string) => {
      if (authBypassEnabled) return true;
      return permissions.includes(requiredPermission);
    },
    [authBypassEnabled, permissions],
  );

  return {
    permissions,
    loading: !authBypassEnabled && (roleLoading || !roleMatchesBusiness),
    hasPermission,
    refreshPermissions: refreshRole,
  };
}
