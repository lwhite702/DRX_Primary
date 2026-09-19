import type { Metadata } from "next";

import { CyberCtaFooter } from "@/components/marketing/landing/cyber-cta-footer";
import { CyberNav } from "@/components/marketing/landing/cyber-nav";
import { MintlifyHub } from "@/components/marketing/landing/mintlify-hub";

export const metadata: Metadata = {
  title: "Updates | DRX",
  description:
    "Product updates, release changelog, roadmap, and Help Scout support for DRX.",
};

export default function UpdatesPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-obsidian text-white">
      <div className="cyber-grid-overlay" aria-hidden />
      <div className="cyber-noise-overlay" aria-hidden />

      <CyberNav />

      <div className="relative z-10 pt-24">
        <MintlifyHub />
        <CyberCtaFooter />
      </div>
    </main>
  );
}
