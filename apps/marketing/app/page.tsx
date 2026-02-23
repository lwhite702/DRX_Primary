import type { Metadata } from "next";
import Link from "next/link";

import {
  LandingHeroSection,
  LandingKeyBentoSection,
} from "@/components/marketing/landing/sections";
import { ShellLayout } from "@/components/marketing/shell-layout";
import { MarketFooter } from "@/components/marketing/market-footer";
import { appWaitlistUrl } from "@/lib/app-links";

export const metadata: Metadata = {
  title: "Deelrx CRM | Built for Dispensaries. Period.",
  description:
    "Track customers, balances, inventory, and daily numbers in one system made for dispensary operators.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="noise-overlay" />

      <ShellLayout>
        <LandingHeroSection />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="glass-effect rounded-[2rem] p-8 md:p-10">
            <h2 className="headline-text text-4xl text-white">Let&apos;s Be Real.</h2>
            <div className="body-copy mt-6 space-y-3 text-lg text-text-secondary">
              <p>Running a dispensary isn&apos;t the same as running a corner store.</p>
              <p>You&apos;ve got regulars.</p>
              <p>You&apos;ve got account balances.</p>
              <p>You&apos;ve got inventory that moves fast.</p>
              <p>You&apos;ve got compliance to think about.</p>
              <p>You&apos;ve got real money on the line.</p>
              <p>Most POS systems just ring people up.</p>
              <p>Most CRMs are made for office sales teams.</p>
              <p>That&apos;s not your world.</p>
              <p>DRX was built for dispensaries that need control without the chaos.</p>
            </div>
          </div>
        </section>

        <LandingKeyBentoSection />

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="glass-effect rounded-[2rem] p-8 md:p-10">
            <h2 className="headline-text text-3xl text-white">Here&apos;s the Flow</h2>
            <div className="body-copy mt-5 grid gap-2 text-text-secondary md:grid-cols-2">
              <p>Customer walks in.</p>
              <p>Pull up their profile.</p>
              <p>Check their balance.</p>
              <p>Process the sale.</p>
              <p>Inventory updates automatically.</p>
              <p>You check your numbers before closing.</p>
            </div>
            <p className="body-copy mt-5 text-white">Fast. Simple. Done.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="luminosity-card rounded-[2rem] p-8 md:p-10">
            <h2 className="headline-text text-3xl text-white">Simple on Day One. Ready When You Scale.</h2>
            <div className="mt-5 grid gap-8 md:grid-cols-2">
              <div>
                <p className="technical-label text-neon-lime">Day one</p>
                <ul className="body-copy mt-3 list-disc space-y-2 pl-5 text-text-secondary">
                  <li>Track customers</li>
                  <li>Log sales</li>
                  <li>Monitor balances</li>
                </ul>
              </div>
              <div>
                <p className="technical-label text-neon-lime">As you grow</p>
                <ul className="body-copy mt-3 list-disc space-y-2 pl-5 text-text-secondary">
                  <li>Manage multiple locations</li>
                  <li>See deeper reports</li>
                  <li>Spot what&apos;s making you money</li>
                </ul>
              </div>
            </div>
            <p className="body-copy mt-5 text-text-secondary">No bloated setup. No unnecessary clutter.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="rounded-[2rem] border border-neon-lime/30 bg-neon-lime/5 p-8 text-center md:p-12">
            <h2 className="headline-text text-3xl text-white md:text-5xl">
              Stop Forcing Generic Software to Run Your Dispensary.
            </h2>
            <p className="body-copy mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
              Get a system that actually fits how you operate.
            </p>
            <div className="mt-8">
              <Link href={appWaitlistUrl} className="neon-pulse-button inline-flex h-12 items-center px-7 text-sm font-semibold">
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
