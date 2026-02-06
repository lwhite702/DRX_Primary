import { useEffect, useState, useCallback } from "react";
import { useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { getCurrentBusinessProfile } from "@/app/actions/get-current-business";

export function useBusiness() {
  const { isLoaded: isUserLoaded } = useUser();
  const { organization: activeOrg, isLoaded: isOrgLoaded } = useOrganization();
  const {
    userMemberships,
    setActive,
    isLoaded: isListLoaded,
  } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [business, setBusiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusinessProfile = useCallback(async () => {
    if (!activeOrg) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await getCurrentBusinessProfile();
      setBusiness(profile);
    } catch (error) {
      console.error("Error fetching business profile:", error);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    if (isOrgLoaded) {
      setLoading(true);
      fetchBusinessProfile();
    }
  }, [fetchBusinessProfile, isOrgLoaded]);

  // Sync available businesses from Clerk membershps
  const availableBusinesses =
    userMemberships?.data?.map((mem) => ({
      id: mem.organization.id, // This is the Clerk Org ID
      business_name: mem.organization.name,
      // Add other mapped fields if necessary for UI compatibility
    })) || [];

  const isLoaded = isUserLoaded && isOrgLoaded && isListLoaded;

  return {
    business, // Local DB BusinessProfile (with UUID)
    availableBusinesses, // Clerk Organizations (with Clerk IDs)
    loading: loading || !isLoaded,
    needsSetup:
      isLoaded && availableBusinesses.length === 0 && !loading && !activeOrg,
    refreshBusiness: fetchBusinessProfile,
    switchBusiness: (organizationId: string) => {
      // Expects Clerk Organization ID
      setActive?.({ organization: organizationId });
    },
  };
}
