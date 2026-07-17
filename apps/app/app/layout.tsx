import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { FeaturebaseProvider } from "@/components/providers/featurebase-provider";
import dynamic from "next/dynamic";
import {
  isAuthBypassEnabledServer,
  getBypassAuthUserId,
  getBypassAuthOrgId,
} from "@/lib/auth/bypass";
import Script from 'next/script';

const ClerkProviderWrapper = dynamic(
  () => import("./_components/clerk-provider-wrapper"),
  { ssr: false }
);

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app",
  ),
  alternates: {
    canonical: "/",
  },
  title:
    isAuthBypassEnabledServer()
      ? "[BYPASS] Deelrx - Run real transactions. Without the mess."
      : "Deelrx - Run real transactions. Without the mess.",
  description:
    "Deelrx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
  icons: {
    icon: "/brand/favicon-32.png",

    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Deelrx - Run real transactions. Without the mess.",
    description:
      "Deelrx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    type: "website",
    locale: "en_US",
    url: "/",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deelrx - Run real transactions. Without the mess.",
    description:
      "Deelrx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    images: ["/brand/opengraph-image.png"],
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
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldEnableMeticulous =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  /*
    Justification for NEXT_PUBLIC_METICULOUS_TOKEN: This token is a public recording key
    used to identify this project when sending session recordings to Meticulous.
    It does not expose any administrative access or secrets and is designed to run
    fully client-side in the user's browser, similar to a Sentry DSN or Google Analytics ID.
  */
  const meticulousToken = process.env.NEXT_PUBLIC_METICULOUS_TOKEN;
  const canLoadMeticulous = shouldEnableMeticulous && Boolean(meticulousToken);

  const isBypassActive = isAuthBypassEnabledServer();
  const bypassUserId = isBypassActive ? getBypassAuthUserId() : undefined;
  const bypassOrgId = isBypassActive ? getBypassAuthOrgId() : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {canLoadMeticulous ? (
          <script
            data-recording-token={meticulousToken}
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        ) : null}
        <Script
          src="https://www.vexo.co/analytics.js"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} ${geistMono.variable} ${plusJakartaSans.className} bg-background text-foreground antialiased`}
      >
        <ClerkProviderWrapper
          isBypassActive={isBypassActive}
          bypassUserId={bypassUserId}
          bypassOrgId={bypassOrgId}
          signInUrl="/login"
          signUpUrl="/register"
          waitlistUrl="/waitlist"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
          afterSignOutUrl="/login"
        >
          <GlobalErrorBoundary>
            <PostHogProvider>
              <FeaturebaseProvider />
              {children}
              <Toaster position="top-right" />
            </PostHogProvider>
          </GlobalErrorBoundary>
        </ClerkProviderWrapper>
      </body>
    </html>
  );
}
