"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { BusinessSetupProvider } from "@/components/providers/business-setup-provider";
import { CustomerProvider } from "@/components/providers/customer-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { OnboardingContext } from "./onboarding-context";

// Dynamic import of heavy onboarding components
const LazyOnboardingProvider = dynamic(
  () =>
    import("@/components/providers/onboarding-provider").then(
      (module) => module.OnboardingProvider,
    ),
  { ssr: false },
);

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
      <OnboardingContext.Provider value={completedOnboardingState}>
        {baseProviders}
      </OnboardingContext.Provider>
    );
  }

  // If onboarding is incomplete, wrap in the dynamic onboarding provider and flow
  return (
    <BusinessSetupProvider>
      <OfflineProvider>
        <LazyOnboardingProvider>
          <CustomerProvider>
            {children}
            <LazyOnboardingFlow />
          </CustomerProvider>
        </LazyOnboardingProvider>
      </OfflineProvider>
    </BusinessSetupProvider>
  );
}

