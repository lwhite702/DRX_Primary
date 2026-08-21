"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useOrganizationList,
  useUser,
  useIsBypassActive,
} from "@/lib/adapters/auth/ui";
import { getCurrentBusinessProfile } from "@/app/actions/get-current-business";

export type BusinessLoadStatus =
  "idle" | "loading" | "refreshing" | "success" | "empty" | "error";

type BusinessProfile = Record<string, any>;

interface BusinessContextValue {
  business: BusinessProfile | null;
  settings: Record<string, unknown> | null;
  availableBusinesses: Array<{ id: string; business_name: string }>;
  status: BusinessLoadStatus;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  needsSetup: boolean;
  refreshBusiness: () => Promise<void>;
  switchBusiness: (organizationId: string) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

function useBusinessState(): BusinessContextValue {
  const authBypassEnabled = useIsBypassActive();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [status, setStatus] = useState<BusinessLoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const switchQueue = useRef<Promise<void>>(Promise.resolve());
  const hasResolved = useRef(false);
  const identityKey = authBypassEnabled ? "bypass" : (user?.id ?? "signed-out");

  const fetchBusinessProfile = useCallback(async () => {
    if (!isUserLoaded && !authBypassEnabled) return;

    const version = ++requestVersion.current;
    setStatus(hasResolved.current ? "refreshing" : "loading");
    setError(null);

    try {
      const profile = await getCurrentBusinessProfile();
      if (version !== requestVersion.current) return;

      setBusiness(profile);
      setStatus(profile ? "success" : "empty");
      hasResolved.current = true;
    } catch (caught) {
      if (version !== requestVersion.current) return;

      console.error("Error fetching business profile:", caught);
      setError(
        "We could not load your business. Check your connection and try again.",
      );
      setStatus("error");
      hasResolved.current = true;
    }
  }, [authBypassEnabled, identityKey, isUserLoaded]);

  useEffect(() => {
    requestVersion.current += 1;
    hasResolved.current = false;
    setBusiness(null);
    setError(null);
    setStatus(isUserLoaded || authBypassEnabled ? "loading" : "idle");

    if (isUserLoaded || authBypassEnabled) {
      void fetchBusinessProfile();
    }

    return () => {
      requestVersion.current += 1;
    };
  }, [authBypassEnabled, fetchBusinessProfile, identityKey, isUserLoaded]);

  const availableBusinesses = useMemo(
    () =>
      userMemberships?.data?.map((membership: any) => ({
        id: membership.organization.id,
        business_name: membership.organization.name,
      })) ?? [],
    [userMemberships?.data],
  );

  const bypassBusinesses = useMemo(
    () =>
      authBypassEnabled && business
        ? [
            {
              id: String(business.clerkOrgId || business.id),
              business_name: String(
                business.businessName ||
                  business.business_name ||
                  "Local Business",
              ),
            },
          ]
        : [],
    [authBypassEnabled, business],
  );

  const switchBusiness = useCallback(
    (organizationId: string) => {
      if (authBypassEnabled || !setActive) return;
      const version = ++requestVersion.current;
      hasResolved.current = false;
      setBusiness(null);
      setError(null);
      setStatus("loading");
      const operation = switchQueue.current.then(async () => {
        // A newer selection can supersede a queued switch before it reaches Clerk.
        if (version !== requestVersion.current) return;
        try {
          await setActive({ organization: organizationId });
          if (version !== requestVersion.current) return;
          await fetchBusinessProfile();
        } catch (caught) {
          if (version !== requestVersion.current) return;
          console.error("Error switching business:", caught);
          setError("We could not switch businesses. Try again.");
          setStatus("error");
          hasResolved.current = true;
        }
      });
      // Keep Clerk organization mutations serialized even after an individual
      // activation fails so the latest requested organization always wins.
      switchQueue.current = operation.then(
        () => undefined,
        () => undefined,
      );
    },
    [authBypassEnabled, fetchBusinessProfile, setActive],
  );

  return useMemo(
    () => ({
      business,
      settings:
        business && "settingsData" in business
          ? ((business.settingsData as Record<string, unknown> | undefined) ??
            null)
          : null,
      availableBusinesses: authBypassEnabled
        ? bypassBusinesses
        : availableBusinesses,
      status,
      loading:
        status === "idle" ||
        status === "loading" ||
        (!isUserLoaded && !authBypassEnabled),
      refreshing: status === "refreshing",
      error,
      needsSetup: status === "empty",
      refreshBusiness: fetchBusinessProfile,
      switchBusiness,
    }),
    [
      authBypassEnabled,
      availableBusinesses,
      business,
      bypassBusinesses,
      error,
      fetchBusinessProfile,
      isUserLoaded,
      status,
      switchBusiness,
    ],
  );
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const value = useBusinessState();
  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
