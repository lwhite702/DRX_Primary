import { AppShell } from "@/components/layout/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { OnboardingProvider } from "@/components/providers/onboarding-provider";
import { CustomerProvider } from "@/components/providers/customer-provider";
import { BusinessSetupProvider } from "@/components/providers/business-setup-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessSetupProvider>
      <OfflineProvider>
        <OnboardingProvider>
          <CustomerProvider>
            <AppShell>{children}</AppShell>
            <OnboardingFlow />
          </CustomerProvider>
        </OnboardingProvider>
      </OfflineProvider>
    </BusinessSetupProvider>
  );
}
