import type { Metadata } from "next";

import { RebuiltMarketingSections } from "@/components/marketing/rebuild/sections";
import { PageViewTracker } from "@/components/marketing/site/page-view-tracker";

export const metadata: Metadata = {
  title: "Deelrx CRM | Built for the ones who run it",
  description:
    "Keep customers, products, stock, sales, payments, and balances due straight.",
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <PageViewTracker />
      <RebuiltMarketingSections />
    </main>
  );
}
