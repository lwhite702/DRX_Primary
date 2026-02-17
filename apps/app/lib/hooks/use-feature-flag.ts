"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { createAppClient } from "@/lib/data/client/supabase-client";

export function useFeatureFlag(featureId: string) {
  const { business } = useBusiness();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const supabase = createAppClient();

  useEffect(() => {
    async function checkFeature() {
      if (!supabase) return;

      try {
        setLoading(true);

        // If no business context, we can only check global flags that don't depend on business
        // But for this system, we mostly care about business context.
        // Fallback to global only check if business is missing?
        // Or default false? Let's check RPC with null business_id if we supported that,
        // but our RPC expects uuid.

        if (!business?.id) {
          // Check only global flag
          const { data: globalFlag } = await supabase
            .from("feature_flags")
            .select("is_global_enabled")
            .eq("id", featureId)
            .single();

          setIsEnabled(globalFlag?.is_global_enabled ?? false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc("has_feature", {
          p_business_id: business.id,
          p_feature_id: featureId,
        });

        if (error) {
          console.error(`Error checking feature ${featureId}:`, error);
          setIsEnabled(false);
        } else {
          setIsEnabled(data);
        }
      } catch (err) {
        console.error(err);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    }

    checkFeature();
  }, [business?.id, featureId, supabase]);

  return { isEnabled, loading };
}
