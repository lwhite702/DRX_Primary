import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://deelrxcrm.com",
  ),
  alternates: {
    canonical: "/",
  },
  title: "Deelrx CRM (DRX) - POS and inventory for independent retail",
  description:
    "Operator-first POS, inventory, customer records, and reporting built for independent retailers.",
  icons: {
    icon: "/brand/favicon-32.png",
    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Deelrx CRM (DRX) - POS and inventory for independent retail",
    description:
      "Operator-first POS, inventory, customer records, and reporting built for independent retailers.",
    type: "website",
    locale: "en_US",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deelrx CRM (DRX) - POS and inventory for independent retail",
    description:
      "Operator-first POS, inventory, customer records, and reporting built for independent retailers.",
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
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
