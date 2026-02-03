import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { FeaturebaseProvider } from "@/components/providers/featurebase-provider";
import { ClerkProvider } from "@wrelik/auth/next";

const _geistSans = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const _inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "DeelRx - Run real transactions. Without, mess.",
  description:
    "DeelRx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
  icons: {
    icon: "/brand/favicon-32.png",

    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "DeelRx - Run real transactions. Without, mess.",
    description:
      "DeelRx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    type: "website",
    locale: "en_US",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeelRx - Run real transactions. Without, mess.",
    description:
      "DeelRx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
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
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${_plusJakartaSans.className} ${_inter.className} bg-background text-foreground antialiased`}
        >
          <GlobalErrorBoundary>
            <PostHogProvider>
              <FeaturebaseProvider />
              {children}
              <Toaster position="top-right" />
            </PostHogProvider>
          </GlobalErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
