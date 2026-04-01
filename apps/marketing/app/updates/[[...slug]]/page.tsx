import type { Metadata } from "next";

import { CyberCtaFooter } from "@/components/marketing/landing/cyber-cta-footer";
import { CyberNav } from "@/components/marketing/landing/cyber-nav";
import { FeaturebaseHub } from "@/components/marketing/landing/featurebase-hub";

export const metadata: Metadata = {
  title: "Updates | DRX",
  description:
    "Feedback board, changelog, and roadmap for DRX in one embedded workspace.",
};

export default function UpdatesPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-obsidian text-white">
      <div className="cyber-grid-overlay" aria-hidden />
      <div className="cyber-noise-overlay" aria-hidden />

      <CyberNav />

      <div className="relative z-10 pt-24">
        <FeaturebaseHub />
        <CyberCtaFooter />
      </div>
    </main>
  );
}
