import type { Metadata } from "next";

import { LandingPageSections } from "@/components/marketing/landing/sections";
import { PageViewTracker } from "@/components/marketing/site/page-view-tracker";

export const metadata: Metadata = {
  title: "Deelrx CRM (DRX) | Track sales, stock, and customers without confusion",
  description:
    "Deelrx CRM (DRX) is a simple system to track sales, stock, and customers without the confusion.",
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <PageViewTracker />
      <div className="page-grid-overlay" />
      <div className="page-glow" />
      <LandingPageSections />
    </main>
  );
}
