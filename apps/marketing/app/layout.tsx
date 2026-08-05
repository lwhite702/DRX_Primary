import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from "next/font/google";

import "./globals.css";

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
    process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://deelrxcrm.com",
  ),
  alternates: {
    canonical: "/",
  },
  title: "Deelrx CRM (DRX) - Track sales, stock, and customers without confusion",
  description:
    "Deelrx CRM (pronounced Dealers, DRX) is a simple system to track sales, stock, and customers without the confusion.",
  icons: {
    icon: "/brand/favicon-32.png",
    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Deelrx CRM (DRX) - Track sales, stock, and customers without confusion",
    description:
      "Deelrx CRM (pronounced Dealers, DRX) is a simple system to track sales, stock, and customers without the confusion.",
    type: "website",
    locale: "en_US",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deelrx CRM (DRX) - Track sales, stock, and customers without confusion",
    description:
      "Deelrx CRM (pronounced Dealers, DRX) is a simple system to track sales, stock, and customers without the confusion.",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
