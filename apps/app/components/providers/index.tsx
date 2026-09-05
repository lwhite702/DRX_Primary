"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { BusinessSetupProvider } from "@/components/providers/business-setup-provider";
import { BusinessProvider } from "@/lib/hooks/use-business";
import { CustomerProvider } from "@/components/providers/customer-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { OnboardingContext } from "./onboarding-context";
import { OnboardingProvider } from "./onboarding-provider";

// Only the optional flow is lazy: delaying the provider blanks its child routes.
const LazyOnboardingFlow = dynamic(
  () =>
    import("@/components/onboarding/onboarding-flow").then(
      (module) => module.OnboardingFlow,
    ),
  { ssr: false },
);

// Fallback context values for fully onboarded users
const completedOnboardingState = {
  steps: { profile: true, product: true, customer: true, sale: true },
  isLoading: false,
  isRefreshing: false,
  error: null,
  progress: 100,
  isComplete: true,
  refreshOnboarding: async () => {},
  dismissGuide: () => {},
  isGuideDismissed: true,
};

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [isOnboardingNeeded, setIsOnboardingNeeded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const complete = window.localStorage.getItem("drx_onboarding_complete") === "true";
    setIsOnboardingNeeded(!complete);
  }, []);

  // Standard flat providers structure
  const baseProviders = (
    <BusinessSetupProvider>
      <OfflineProvider>
        <CustomerProvider>{children}</CustomerProvider>
      </OfflineProvider>
    </BusinessSetupProvider>
  );

  // If we are server-side or onboarding is complete, use the lightweight context provider
  if (!isClient || !isOnboardingNeeded) {
    return (
      <BusinessProvider>
        <OnboardingContext.Provider value={completedOnboardingState}>
          {baseProviders}
        </OnboardingContext.Provider>
      </BusinessProvider>
    );
  }

  // Keep route content available while the optional onboarding flow loads.
  return (
    <BusinessProvider>
      <BusinessSetupProvider>
        <OfflineProvider>
          <OnboardingProvider>
            <CustomerProvider>
              {children}
              <LazyOnboardingFlow />
            </CustomerProvider>
          </OnboardingProvider>
        </OfflineProvider>
      </BusinessSetupProvider>
    </BusinessProvider>
  );
}
