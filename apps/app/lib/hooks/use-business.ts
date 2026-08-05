import { useEffect, useState, useCallback } from "react";
import { useOrganizationList, useUser, useIsBypassActive } from "@/lib/adapters/auth/ui";
import { getCurrentBusinessProfile } from "@/app/actions/get-current-business";

export function useBusiness() {
  const authBypassEnabled = useIsBypassActive();
  const { isLoaded: isUserLoaded } = useUser();
  const {
    userMemberships,
    setActive,
  } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [business, setBusiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusinessProfile = useCallback(async () => {
    if (!isUserLoaded && !authBypassEnabled) {
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
  }, [authBypassEnabled, isUserLoaded]);

  useEffect(() => {
    if (isUserLoaded || authBypassEnabled) {
      setLoading(true);
      void fetchBusinessProfile();
    }
  }, [fetchBusinessProfile, isUserLoaded, authBypassEnabled]);

  // Sync available businesses from Clerk memberships
  const availableBusinesses =
    userMemberships?.data?.map((mem: any) => ({
      id: mem.organization.id, // This is the Clerk Org ID
      business_name: mem.organization.name,
      // Add other mapped fields if necessary for UI compatibility
    })) ||
    [];

  const bypassBusinesses =
    authBypassEnabled && business
      ? [
          {
            id: (business.clerkOrgId || business.id) as string,
            business_name: (business.businessName || business.business_name || "Local Business") as string,
          },
        ]
      : [];

  return {
    business, // Local DB BusinessProfile (with UUID)
    settings:
      business &&
      typeof business === "object" &&
      "settingsData" in business
        ? (business as { settingsData?: Record<string, unknown> }).settingsData
        : null,
    availableBusinesses: authBypassEnabled ? bypassBusinesses : availableBusinesses, // Clerk Organizations (with Clerk IDs)
    // The database profile is the durable business record created by onboarding.
    // Clerk organization memberships enhance switching, but must not block the app
    // or reopen setup for accounts that do not have a Clerk organization.
    loading: loading || (!isUserLoaded && !authBypassEnabled),
    needsSetup: !loading && !business,
    refreshBusiness: fetchBusinessProfile,
    switchBusiness: (organizationId: string) => {
      // Expects Clerk Organization ID
      if (authBypassEnabled) return;
      setActive?.({ organization: organizationId });
    },
  };
}
