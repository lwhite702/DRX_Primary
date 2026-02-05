import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserBusinessesAction } from "@/app/actions/business";

export function useBusiness() {
  const { user, isLoaded } = useUser();
  const [business, setBusiness] = useState<any | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = useCallback(async () => {
    if (!isLoaded) return;

    if (!user) {
      setBusiness(null);
      setAvailableBusinesses([]);
      setLoading(false);
      return;
    }

    try {
      const { businesses, error } = await getUserBusinessesAction();

      if (businesses && businesses.length > 0) {
        setAvailableBusinesses(businesses);

        // Determine selected business
        const storedBusinessId = localStorage.getItem("selectedBusinessId");
        let selected = businesses.find((b) => b.id === storedBusinessId);

        if (!selected) {
          selected = businesses[0];
          localStorage.setItem("selectedBusinessId", selected.id);
        }

        setBusiness(selected);
      } else {
        setBusiness(null);
        setAvailableBusinesses([]);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const switchBusiness = (businessId: string) => {
    const selected = availableBusinesses.find((b) => b.id === businessId);
    if (selected) {
      setBusiness(selected);
      localStorage.setItem("selectedBusinessId", selected.id);
      window.location.reload();
    }
  };

  return {
    business,
    availableBusinesses,
    loading: loading || !isLoaded,
    needsSetup: !loading && isLoaded && availableBusinesses.length === 0,
    refreshBusiness: fetchBusiness,
    switchBusiness,
  };
}
