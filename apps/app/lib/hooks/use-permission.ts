import { useCallback, useMemo } from "react";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { useUserRole } from "./use-user-role";

export function usePermission(businessId: string | undefined) {
  const authBypassEnabled = useIsBypassActive();
  const {
    role,
    roleBusinessId,
    loading: roleLoading,
    refreshRole,
  } = useUserRole(businessId);
  const permissions = useMemo(
    () =>
      authBypassEnabled
        ? ["*"]
        : role
          ? (ROLE_PERMISSIONS[role] as string[] ?? [])
          : [],
    [authBypassEnabled, role],
  );

  const hasPermission = useCallback(
    (requiredPermission: string) => {
      if (authBypassEnabled) return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(requiredPermission);
    },
    [authBypassEnabled, permissions],
  );

  return {
    permissions,
    loading:
      !authBypassEnabled &&
      (roleLoading || (Boolean(businessId) && !role)),
    hasPermission,
    refreshPermissions: refreshRole,
  };
}
