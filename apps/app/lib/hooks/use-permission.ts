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
  const roleMatchesBusiness = Boolean(businessId) && roleBusinessId === businessId;
  const permissions = useMemo(
    () =>
      authBypassEnabled
        ? ["*"]
        : roleMatchesBusiness && role
          ? ROLE_PERMISSIONS[role]
          : [],
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
    loading:
      !authBypassEnabled &&
      (!businessId || roleLoading || !roleMatchesBusiness),
    hasPermission,
    refreshPermissions: refreshRole,
  };
}
