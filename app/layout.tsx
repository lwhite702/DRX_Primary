import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { BusinessSetupProvider } from "@/components/providers/business-setup-provider";
import { AppShell } from "@/components/layout/app-shell";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { OnboardingProvider } from "@/components/providers/onboarding-provider";

const _geistSans = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DRX CRM - DeelRx Point of Sale & Customer Management",
  description:
    "Privacy-first POS, CRM, inventory, and credit management system for small businesses",
  icons: {
    icon: "/DeelRx CRM.svg",
  },
  generator: "v0.app",
  openGraph: {
    title: "DRX CRM - DeelRx Point of Sale & Customer Management",
    description:
      "Privacy-first POS, CRM, inventory, and credit management system for small businesses",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DRX CRM - DeelRx Point of Sale & Customer Management",
    description:
      "Privacy-first POS, CRM, inventory, and credit management system",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <GlobalErrorBoundary>
          <BusinessSetupProvider>
            <OfflineProvider>
              <PostHogProvider>
                <OnboardingProvider>
                  <AppShell>{children}</AppShell>
                  <OnboardingFlow />
                  <Toaster position="top-right" />
                </OnboardingProvider>
              </PostHogProvider>
            </OfflineProvider>
          </BusinessSetupProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
