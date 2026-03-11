import type { Metadata } from "next";
import Link from "next/link";

import { Features } from "@/components/marketing/features";
import { LandingHeroSection } from "@/components/marketing/landing/sections";
import { MarketFooter } from "@/components/marketing/market-footer";
import { ShellLayout } from "@/components/marketing/shell-layout";
import { appWaitlistUrl } from "@/lib/app-links";
import { whyDrxExists } from "@/lib/feature-canon";

export const metadata: Metadata = {
  title: "DRX | Built for operators who run real businesses.",
  description:
    "Fast, no-nonsense POS and customer system for independent dispensaries and operators who need speed, control, and clarity.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="noise-overlay" />

      <ShellLayout>
        <LandingHeroSection />

        <Features />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="glass-effect rounded-[2rem] p-8 md:p-10">
            <h2 className="headline-text text-3xl text-white">Why DRX Exists</h2>
            <p className="body-copy mt-5 text-text-secondary">{whyDrxExists.intro}</p>
            <ul className="body-copy mt-5 list-disc space-y-2 pl-5 text-text-secondary">
              {whyDrxExists.operators.map((operatorTrait) => (
                <li key={operatorTrait}>{operatorTrait}</li>
              ))}
            </ul>
            <p className="body-copy mt-5 text-white">{whyDrxExists.close}</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="rounded-[2rem] border border-neon-lime/30 bg-neon-lime/5 p-8 text-center md:p-12">
            <h2 className="headline-text text-3xl text-white md:text-5xl">
              Built for real storefront energy.
            </h2>
            <p className="body-copy mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
              Simple. Fast. In control.
            </p>
            <div className="mt-8">
              <Link
                href={appWaitlistUrl}
                className="neon-pulse-button inline-flex h-12 items-center px-7 text-sm font-semibold"
              >
                Join Beta Waitlist
              </Link>
            </div>
          </div>
        </section>

        <MarketFooter />
      </ShellLayout>
    </main>
  );
}
