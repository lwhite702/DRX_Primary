import type { Metadata } from "next";

import { RebuiltMarketingSections } from "@/components/marketing/rebuild/sections";
import { PageViewTracker } from "@/components/marketing/site/page-view-tracker";

export const metadata: Metadata = {
  title: "Deelrx CRM | Built for the ones who run it",
  description:
    "Keep customers, products, stock, sales, payments, and balances due straight.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://deelrxcrm.com/#organization",
      name: "Wrelik Brands LLC",
      legalName: "Wrelik Brands LLC",
      url: "https://deelrxcrm.com",
      logo: "https://deelrxcrm.com/brand/drx-wordmark-color.svg",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@deelrxcrm.com",
        contactType: "customer support",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://deelrxcrm.com/#software",
      name: "DRX (Deelrx CRM)",
      alternateName: ["Deelrx CRM", "DRX"],
      applicationCategory: "BusinessApplication",
      operatingSystem: "iOS, Android, Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/OnlineOnly",
      },
      description:
        "Privacy-first operating system for independent retail operators to track products, stock, sales, and customer store accounts without clutter.",
      publisher: {
        "@id": "https://deelrxcrm.com/#organization",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageViewTracker />
      <RebuiltMarketingSections />
    </main>
  );
}
