import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/adapters/auth/ui";
import { getUserRoleAction } from "@/app/actions/user-role";
import { Permission, ROLE_PERMISSIONS } from "@/lib/auth/permissions";

export type UserRole =
  | "owner"
  | "manager"
  | "admin"
  | "staff"
  | "cashier"
  | "supervisor"
  | "super_admin"
  | null;

export function useUserRole(businessId?: string) {
  const authBypassEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (authBypassEnabled) {
      setRole("super_admin");
      setLoading(false);
      setError(null);
      return;
    }

    if (!isLoaded) return;

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { role: fetchedRole, error: fetchError } =
        await getUserRoleAction(businessId);

      if (fetchError) {
        setError(fetchError);
      } else {
        setRole(fetchedRole as UserRole);
      }
    } catch (err) {
      console.error("Error in useUserRole:", err);
      setError("Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded, businessId, authBypassEnabled]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const isAdmin =
    role === "owner" || role === "admin" || role === "super_admin";
  const isManager =
    role === "owner" ||
    role === "manager" ||
    role === "admin" ||
    role === "super_admin";
  const canOverridePrice = isManager;

  const hasPermission = (permission: Permission) => {
    if (!role) return false;
    if (role === "super_admin") return true;
    const allowed = ROLE_PERMISSIONS[role];
    return allowed ? allowed.includes(permission) : false;
  };

  return {
    role,
    loading: !isLoaded || loading,
    error,
    isAdmin,
    isManager,
    canOverridePrice,
    refreshRole: fetchRole,
    hasPermission,
  };
}
