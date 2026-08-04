import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { FeaturebaseProvider } from "@/components/providers/featurebase-provider";
import { ClerkProvider } from "@/lib/adapters/auth/ui";

const _plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const _inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.deelrxcrm.app",
  ),
  alternates: {
    canonical: "/",
  },
  title:
    process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true"
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
  themeColor: "#0B0B0C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldEnableMeticulous =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const meticulousToken = process.env.NEXT_PUBLIC_METICULOUS_TOKEN;
  const canLoadMeticulous = shouldEnableMeticulous && Boolean(meticulousToken);
  const appContent = (
    <GlobalErrorBoundary>
      <PostHogProvider>
        <FeaturebaseProvider />
        {children}
        <Toaster position="top-right" />
      </PostHogProvider>
    </GlobalErrorBoundary>
  );

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
      </head>
      <body
        className={`${_plusJakartaSans.className} ${_inter.className} bg-background text-foreground antialiased`}
      >
        <ClerkProvider
          signInUrl="/login"
          signUpUrl="/register"
          waitlistUrl="/waitlist"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
          afterSignOutUrl="/login"
        >
          {appContent}
        </ClerkProvider>
      </body>
    </html>
  );
}
