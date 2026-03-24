import type { Metadata } from "next";

import { LandingPageSections } from "@/components/marketing/landing/sections";
import { MarketFooter } from "@/components/marketing/market-footer";
import { ShellLayout } from "@/components/marketing/shell-layout";

export const metadata: Metadata = {
  title: "Pixel Pronto | Your business, online and earning — pronto.",
  description:
    "Pixel Pronto is a fast-launch small business growth system with website, lead capture, booking, payments, and managed setup in one cleaner path.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="noise-overlay" />

      <ShellLayout>
        <LandingPageSections />
        <MarketFooter />
      </ShellLayout>
    </main>
  );
}
