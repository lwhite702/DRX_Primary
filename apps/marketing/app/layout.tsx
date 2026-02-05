import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Deelrx CRM - Run real transactions. Without the mess.",
  description:
    "Deelrx CRM is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
  icons: {
    icon: "/brand/favicon-32.png",
    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Deelrx CRM - Run real transactions. Without the mess.",
    description:
      "Deelrx CRM is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    type: "website",
    locale: "en_US",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deelrx CRM - Run real transactions. Without the mess.",
    description:
      "Deelrx CRM is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
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
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans bg-black text-white antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
