import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function useBusiness() {
  const [business, setBusiness] = useState<any | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = useState<any[]>([]);
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

      // 1. Fetch all roles to get business IDs
      const { data: roles } = await supabase
        .from("user_roles")
        .select("business_id, role")
        .eq("user_id", user.id);

      const businessIds = roles?.map((r) => r.business_id) || [];

      // 2. Fetch all businesses where user is owner
      const { data: ownedBusinesses } = await supabase
        .from("business_profile")
        .select("id")
        .eq("owner_id", user.id);

      if (ownedBusinesses) {
        ownedBusinesses.forEach((b) => {
          if (!businessIds.includes(b.id)) {
            businessIds.push(b.id);
          }
        });
      }

      if (businessIds.length === 0) {
        setLoading(false);
        return;
      }

      // 3. Fetch details for all accessible businesses
      const { data: businesses } = await supabase
        .from("business_profile")
        .select("*")
        .in("id", businessIds);

      if (businesses && businesses.length > 0) {
        setAvailableBusinesses(businesses);

        // 4. Determine selected business
        const storedBusinessId = localStorage.getItem("selectedBusinessId");
        let selected = businesses.find((b) => b.id === storedBusinessId);

        if (!selected) {
          selected = businesses[0];
          localStorage.setItem("selectedBusinessId", selected.id);
        }

        setBusiness(selected);
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

  const switchBusiness = (businessId: string) => {
    const selected = availableBusinesses.find((b) => b.id === businessId);
    if (selected) {
      setBusiness(selected);
      localStorage.setItem("selectedBusinessId", selected.id);
      // Force reload to ensure all components/hooks re-fetch with new context
      window.location.reload();
    }
  };

  return {
    business,
    availableBusinesses,
    loading,
    needsSetup: !loading && availableBusinesses.length === 0,
    refreshBusiness: fetchBusiness,
    switchBusiness,
  };
}
