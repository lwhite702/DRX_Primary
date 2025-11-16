import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function useBusiness() {
  const [business, setBusiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function fetchBusiness() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user's business from user_roles or business_profile
        const { data: role } = await supabase
          .from("user_roles")
          .select("business_id")
          .eq("user_id", user.id)
          .single();

        if (role?.business_id) {
          const { data: businessData } = await supabase
            .from("business_profile")
            .select("*")
            .eq("id", role.business_id)
            .single();

          if (businessData) {
            setBusiness(businessData);
          }
        } else {
          // Check if user owns a business
          const { data: ownedBusiness } = await supabase
            .from("business_profile")
            .select("*")
            .eq("owner_id", user.id)
            .single();

          if (ownedBusiness) {
            setBusiness(ownedBusiness);
          }
        }
      } catch (error) {
        console.error("Error fetching business:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBusiness();
  }, [supabase]);

  return { business, loading };
}

