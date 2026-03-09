import type { Metadata } from "next";

import { CyberBento } from "@/components/marketing/landing/cyber-bento";
import { CyberCtaFooter } from "@/components/marketing/landing/cyber-cta-footer";
import { CyberHero } from "@/components/marketing/landing/cyber-hero";
import { CyberNav } from "@/components/marketing/landing/cyber-nav";
import { ContrastSteps } from "@/components/marketing/landing/contrast-steps";
import { OperatorsShowcaseSection } from "@/components/marketing/landing/operators-showcase";
import { OrbitalHub } from "@/components/marketing/landing/orbital-hub";

export const metadata: Metadata = {
  title: "DRX | Built for operators who run real businesses.",
  description:
    "Fast, no-nonsense POS and customer system for independent operators who need speed, control, and clear records.",
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-obsidian text-white">
      <div className="cyber-grid-overlay" aria-hidden />
      <div className="cyber-noise-overlay" aria-hidden />

      <CyberNav />

      <div className="relative z-10">
        <CyberHero />
        <OperatorsShowcaseSection />
        <ContrastSteps />
        <CyberBento />
        <OrbitalHub />
        <CyberCtaFooter />
      </div>
    </main>
  );
}
