import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { MarketHeader } from "@/components/marketing/market-header";

const _plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const _inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "DeelRxCRM - Run real transactions. Without the mess.",
  description:
    "DeelRxCRM is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
  icons: {
    icon: "/brand/favicon-32.png",
    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "DeelRxCRM - Run real transactions. Without the mess.",
    description:
      "DeelRxCRM is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    type: "website",
    locale: "en_US",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeelRxCRM - Run real transactions. Without the mess.",
    description:
      "DeelRxCRM is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${_plusJakartaSans.className} ${_inter.className} bg-background text-foreground antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <MarketHeader />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
