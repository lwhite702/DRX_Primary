"use client";

import dynamic from "next/dynamic";
import { BusinessSetupProvider } from "@/components/providers/business-setup-provider";
import { CustomerProvider } from "@/components/providers/customer-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { OnboardingProvider } from "@/components/providers/onboarding-provider";

const LazyOnboardingFlow = dynamic(
  () =>
    import("@/components/onboarding/onboarding-flow").then(
      (module) => module.OnboardingFlow,
    ),
  { ssr: false },
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
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
  );
}

