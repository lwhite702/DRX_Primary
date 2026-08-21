import { useEffect, useState, useCallback, useRef } from "react";
import { useUser, useIsBypassActive } from "@/lib/adapters/auth/ui";
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
  const authBypassEnabled = useIsBypassActive();
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole>(null);
  const [roleBusinessId, setRoleBusinessId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const hasResolved = useRef(false);
  const roleBusinessIdRef = useRef<string | undefined>(undefined);

  const fetchRole = useCallback(async () => {
    const version = ++requestVersion.current;
    if (authBypassEnabled) {
      setRole("super_admin");
      setRoleBusinessId(businessId);
      roleBusinessIdRef.current = businessId;
      setLoading(false);
      setRefreshing(false);
      setError(null);
      hasResolved.current = true;
      return;
    }

    if (!isLoaded) return;

    if (!user) {
      setRole(null);
      setRoleBusinessId(businessId);
      roleBusinessIdRef.current = businessId;
      setLoading(false);
      setRefreshing(false);
      hasResolved.current = true;
      return;
    }

    const canRefreshInPlace =
      hasResolved.current && roleBusinessIdRef.current === businessId;
    if (!canRefreshInPlace) setRole(null);
    setLoading(!canRefreshInPlace);
    setRefreshing(canRefreshInPlace);
    setError(null);

    try {
      const { role: fetchedRole, error: fetchError } =
        await getUserRoleAction(businessId);

      if (version !== requestVersion.current) return;

      if (fetchError) {
        setError(fetchError);
      } else {
        setRole(fetchedRole as UserRole);
      }
    } catch (err) {
      if (version !== requestVersion.current) return;
      console.error("Error in useUserRole:", err);
      setError("We could not verify your role. Try again.");
    } finally {
      if (version === requestVersion.current) {
        setRoleBusinessId(businessId);
        roleBusinessIdRef.current = businessId;
        setLoading(false);
        setRefreshing(false);
        hasResolved.current = true;
      }
    }
  }, [user, isLoaded, businessId, authBypassEnabled]);

  useEffect(() => {
    void fetchRole();
    return () => {
      requestVersion.current += 1;
    };
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
    roleBusinessId,
    loading: !isLoaded || loading,
    refreshing,
    status: !isLoaded || loading ? "loading" : error ? "error" : role ? "success" : "empty",
    error,
    isAdmin,
    isManager,
    canOverridePrice,
    refreshRole: fetchRole,
    hasPermission,
  };
}
