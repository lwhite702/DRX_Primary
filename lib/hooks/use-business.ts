import { useEffect, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BusinessProfile, BusinessSettings } from "../validations/schemas";

export function useBusiness() {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = useState<
    BusinessProfile[]
  >([]);
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

      const businessIds =
        (roles as { business_id: string; role: string }[])?.map(
          (r) => r.business_id,
        ) || [];

      // 2. Fetch all businesses where user is owner
      const { data: ownedBusinesses } = await supabase
        .from("business_profile")
        .select("id")
        .eq("owner_id", user.id);

      if (ownedBusinesses) {
        (ownedBusinesses as { id: string }[]).forEach((b) => {
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
        setAvailableBusinesses(businesses as BusinessProfile[]);

        // 4. Determine selected business
        const storedBusinessId = localStorage.getItem("selectedBusinessId");
        let selected = (businesses as BusinessProfile[]).find(
          (b) => b.id === storedBusinessId,
        );

        if (!selected && businesses.length > 0) {
          selected = businesses[0] as BusinessProfile;
          localStorage.setItem("selectedBusinessId", selected.id as string);
        }

        if (selected) {
          setBusiness(selected as BusinessProfile);

          // 5. Fetch settings for selected business
          if (selected.id) {
            const { data: bSettings } = await supabase
              .from("business_settings")
              .select("*")
              .eq("business_id", selected.id)
              .single();

            if (bSettings) {
              setSettings(bSettings as BusinessSettings);
            }
          }
        }
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
    const activeBusiness = availableBusinesses.find(
      (b: BusinessProfile) => b.id === businessId,
    );
    if (activeBusiness) {
      setBusiness(activeBusiness);
      // Store current business ID in cookie for server-side access if needed
      document.cookie = `businessId=${activeBusiness.id}; path=/; max-age=31536000`;
      // Force reload to ensure all components/hooks re-fetch with new context
      window.location.reload();
    }
  };

  return {
    business,
    settings,
    availableBusinesses,
    loading,
    needsSetup:
      !loading &&
      (availableBusinesses.length === 0 ||
        availableBusinesses.some(
          (b: BusinessProfile) => !b.onboarding_completed,
        )),
    refreshBusiness: fetchBusiness,
    switchBusiness,
  };
}
