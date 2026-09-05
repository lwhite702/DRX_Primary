import type { Metadata } from "next";

import { OperatorsShowcaseSection } from "@/components/marketing/landing/operators-showcase";
import { LandingPageSections } from "@/components/marketing/landing/sections";
import { PageViewTracker } from "@/components/marketing/site/page-view-tracker";

export const metadata: Metadata = {
  title: "Deelrx CRM | Built for the ones who run it",
  description:
    "Fast checkout, tighter inventory, clear sales records, and role-based control for independent retailers.",
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <PageViewTracker />
      <div className="page-grid-overlay" />
      <div className="page-glow" />
      <LandingPageSections operatorShowcase={<OperatorsShowcaseSection />} />
    </main>
  );
}
