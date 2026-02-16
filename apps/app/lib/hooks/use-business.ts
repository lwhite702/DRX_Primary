import { useEffect, useState, useCallback } from "react";
import { useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { getCurrentBusinessProfile } from "@/app/actions/get-current-business";

export function useBusiness() {
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true") {
    return {
      business: null,
      availableBusinesses: [],
      loading: false,
      needsSetup: false,
      refreshBusiness: async () => {},
      switchBusiness: (_organizationId: string) => {},
    };
  }

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

  // Sync available businesses from Clerk memberships
  const availableBusinesses =
    userMemberships?.data?.map((mem) => ({
      id: mem.organization.id, // This is the Clerk Org ID
      business_name: mem.organization.name,
      // Add other mapped fields if necessary for UI compatibility
    })) || [];

  const isBasicLoaded = isUserLoaded && isOrgLoaded;
  const isFullLoaded = isBasicLoaded && isListLoaded;

  // We are "loaded" enough if we have the basic user/org info,
  // or if we're waiting for lists but we already have an active org to work with.
  const isEssentiallyLoaded = isBasicLoaded && (!!activeOrg || isListLoaded);

  return {
    business, // Local DB BusinessProfile (with UUID)
    availableBusinesses, // Clerk Organizations (with Clerk IDs)
    loading: loading || !isEssentiallyLoaded,
    needsSetup:
      isFullLoaded &&
      availableBusinesses.length === 0 &&
      !loading &&
      !activeOrg,
    refreshBusiness: fetchBusinessProfile,
    switchBusiness: (organizationId: string) => {
      // Expects Clerk Organization ID
      setActive?.({ organization: organizationId });
    },
  };
}
