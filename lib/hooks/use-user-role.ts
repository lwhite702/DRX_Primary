import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export type UserRole =
  | "owner"
  | "manager"
  | "admin"
  | "staff"
  | "cashier"
  | null;

export function useUserRole(businessId: string | undefined) {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const fetchRole = useCallback(async () => {
    if (!businessId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Check if user is owner of the business
      const { data: businessData } = await supabase
        .from("business_profile")
        .select("owner_id")
        .eq("id", businessId)
        .single();

      if (businessData?.owner_id === user.id) {
        setRole("owner");
        setLoading(false);
        return;
      }

      // Get user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .single();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        setError(roleError.message);
        setRole(null);
      } else {
        setRole((roleData?.role as UserRole) || null);
      }
    } catch (err) {
      console.error("Error in useUserRole:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, supabase]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const isAdmin = role === "owner" || role === "admin";
  const isManager = role === "owner" || role === "manager" || role === "admin";
  const canOverridePrice = isManager;

  return {
    role,
    loading,
    error,
    isAdmin,
    isManager,
    canOverridePrice,
    refreshRole: fetchRole,
  };
}
