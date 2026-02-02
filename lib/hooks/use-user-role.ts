import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserRoleAction } from "@/app/actions/user-role";
import { Permission } from "@/lib/auth/permissions";

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
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
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
  }, [user, isLoaded, businessId]);

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
    if (role === "super_admin") return true;
    // TODO: Fetch actual permissions from server action if needed
    return true;
  };

  return {
    role,
    loading: loading || !isLoaded,
    error,
    isAdmin,
    isManager,
    canOverridePrice,
    refreshRole: fetchRole,
    hasPermission,
  };
}
