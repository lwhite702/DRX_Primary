import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function useBusiness() {
  const [business, setBusiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  const fetchBusiness = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's business from user_roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("business_id")
        .eq("user_id", user.id);

      if (roles && roles.length > 0) {
        // Use the first role's business
        const { data: businessData } = await supabase
          .from("business_profile")
          .select("*")
          .eq("id", roles[0].business_id)
          .single();

        if (businessData) {
          setBusiness(businessData);
          setLoading(false);
          return;
        }
      }

      // Check if user owns any business (fallback)
      const { data: ownedBusinesses } = await supabase
        .from("business_profile")
        .select("*")
        .eq("owner_id", user.id);

      if (ownedBusinesses && ownedBusinesses.length > 0) {
        // Use the first owned business
        setBusiness(ownedBusinesses[0]);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return {
    business,
    loading,
    needsSetup: !loading && !business,
    refreshBusiness: fetchBusiness,
  };
}
