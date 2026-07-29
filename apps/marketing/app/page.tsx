import type { Metadata } from "next";

import { LandingPageSections } from "@/components/marketing/landing/sections";
import { PageViewTracker } from "@/components/marketing/site/page-view-tracker";

export const metadata: Metadata = {
  title: "Deelrx CRM | Built for the ones who run it",
  description:
    "Fast checkout, real inventory control, clean numbers, and tight permissions for owner-operators.",
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
