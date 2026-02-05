"use client";
import Image from "next/image";
import { ShellLayout } from "@/components/marketing/shell-layout";
import { Hero } from "@/components/marketing/hero";
import { BentoGrid, BentoGridItem } from "@/components/marketing/bento-grid";

import { MarketFooter } from "@/components/marketing/market-footer";
import { SystemStatus } from "@/components/marketing/system-status";
import { Zap, ShieldCheck, BarChart4, Layers } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="bg-black min-h-screen">
      {/* Noise Overlay */}
      <div className="noise-overlay" />

      <ShellLayout>
        {/* Navigation / Command Bar */}
        <nav className="absolute top-0 left-0 w-full z-50 px-6 py-6 md:px-12 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/drx-wordmark-color.svg"
              alt="DRX"
              width={240}
              height={80}
              className="h-24 w-auto"
            />
            <span className="text-2xl font-bold tracking-tighter text-white ml-2 hidden sm:block">
              Deelrx CRM
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 bg-glass-bg border border-glass-border rounded-full px-8 py-3 backdrop-blur-md">
            <span className="text-white/70 hover:text-neon-lime transition-colors cursor-pointer text-sm font-medium">
              Features
            </span>
            <span className="text-white/70 hover:text-neon-lime transition-colors cursor-pointer text-sm font-medium">
              System
            </span>
            <span className="text-white/70 hover:text-neon-lime transition-colors cursor-pointer text-sm font-medium">
              Access
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SystemStatus className="hidden md:flex" />
            <div className="w-2 h-2 rounded-full bg-neon-lime animate-pulse md:hidden"></div>
          </div>
        </nav>

        {/* Hero Section */}
        <Hero />

        {/* Why Deelrx CRM */}
        <section className="px-6 py-24 max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Why Deelrx CRM?
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed">
              Business happens in person. You need a tool that moves as fast as
              you do. We keep the back end quiet so you can handle the front.
            </p>
          </div>
        </section>

        {/* Mental Load Relief */}
        <section className="px-6 py-24 bg-white/5 border-y border-white/5 mb-32">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Leave the remembering to us.
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
              You shouldn’t have to remember everything. If it happened, it’s
              tracked. No guessing. No surprises.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 pb-32 relative z-10">
          <div className="max-w-7xl mx-auto mb-12">
            <h3 className="text-sm font-mono text-neon-lime uppercase tracking-widest mb-4">
              Features
            </h3>
          </div>
          <BentoGrid>
            {/* 1. Selling and POS */}
            <BentoGridItem
              span={2}
              title="Selling and POS"
              description="Sell fast. Keep the line moving."
              header={
                <div className="h-32 w-full bg-gradient-to-br from-neon-lime/20 to-transparent rounded-xl mb-4 border border-neon-lime/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(204,255,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(204,255,0,0.1)_1px,transparent_1px)] bg-[size:1rem_1rem]"></div>
                </div>
              }
              icon={<Zap className="w-6 h-6" />}
            />

            {/* 2. Inventory */}
            <BentoGridItem
              span={1}
              title="Inventory"
              description="Know what you have. Know what you need."
              header={
                <div className="h-32 w-full bg-surface-elevated rounded-xl mb-4 border border-white/5 flex items-end justify-between px-4 pb-4">
                  <div className="w-2 h-12 bg-white/10 rounded-t"></div>
                  <div className="w-2 h-24 bg-neon-lime rounded-t shadow-[0_0_10px_rgba(204,255,0,0.5)]"></div>
                  <div className="w-2 h-16 bg-white/10 rounded-t"></div>
                </div>
              }
              icon={<Layers className="w-6 h-6" />}
            />

            {/* 3. Credit and fronts */}
            <BentoGridItem
              span={1}
              title="Credit and Fronts"
              description="Track who owes you. Track who you owe."
              header={
                <div className="h-32 w-full bg-surface-elevated rounded-xl mb-4 border border-white/5 flex items-center justify-center">
                  <span className="font-mono text-neon-lime text-2xl font-bold">
                    $0.00
                  </span>
                </div>
              }
              icon={<BarChart4 className="w-6 h-6" />}
            />

            {/* 4. Customers */}
            <BentoGridItem
              span={2}
              title="Customers"
              description="Know your people. Keep them happy."
              className="md:col-span-2"
              icon={<Zap className="w-6 h-6" />}
              header={
                <div className="h-24 w-full bg-white/5 rounded-xl border border-white/5" />
              }
            />

            {/* 5. Pricing */}
            <BentoGridItem
              span={2}
              title="Pricing"
              description="Set the right price. Make your margin."
              className="md:col-span-2"
              icon={<BarChart4 className="w-6 h-6" />}
              header={
                <div className="h-24 w-full bg-white/5 rounded-xl border border-white/5" />
              }
            />

            {/* 6. Anywhere access */}
            <BentoGridItem
              span={2}
              title="Anywhere Access"
              description="See your numbers from anywhere."
              className="md:col-span-2"
              icon={<Layers className="w-6 h-6" />}
              header={
                <div className="h-24 w-full bg-white/5 rounded-xl border border-white/5" />
              }
            />

            {/* 7. Privacy */}
            <BentoGridItem
              span={2}
              title="Privacy"
              description="Your data stays with you. No leaks."
              className="md:col-span-2 bg-surface-elevated/50"
              icon={<ShieldCheck className="w-6 h-6" />}
              header={
                <div className="h-24 w-full flex items-center gap-4 opacity-50 overflow-hidden">
                  <span className="font-mono text-xs text-neon-lime whitespace-nowrap">
                    ENCRYPTION_KEY_GENERATED // SESSION_SECURE
                  </span>
                </div>
              }
            />
          </BentoGrid>
        </section>

        {/* Who it's for */}
        <section className="py-24 bg-[#111]">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Who is this for?
              </h2>
              <p className="text-xl text-text-secondary">
                Operators. Street-level businesses. People who value trust and
                privacy.
                <br />
                <br />
                If you learn by doing, this is for you.
              </p>
            </div>
            <div className="border-l border-white/10 pl-8 md:pl-12">
              <h3 className="text-sm font-mono text-neon-lime uppercase mb-4">
                NOT FOR
              </h3>
              <ul className="space-y-2 text-text-muted">
                <li>Corporate chains</li>
                <li>People who like paperwork</li>
                <li>Those who sell data</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-24 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Us vs Them
          </h2>
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            <div className="bg-surface-elevated p-8 rounded-2xl border border-neon-lime/20">
              <h3 className="text-neon-lime font-bold mb-6 text-xl">
                Deelrx CRM
              </h3>
              <ul className="space-y-4 text-white font-medium">
                <li className="flex items-center gap-2">✔ Quiet</li>
                <li className="flex items-center gap-2">✔ Private</li>
                <li className="flex items-center gap-2">✔ Fast</li>
              </ul>
            </div>
            <div className="bg-white/5 p-8 rounded-2xl border border-white/5 opacity-50">
              <h3 className="text-white font-bold mb-6 text-xl">The Others</h3>
              <ul className="space-y-4 text-text-muted">
                <li>Loud</li>
                <li>Public</li>
                <li>Slow</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <MarketFooter />
      </ShellLayout>
    </main>
  );
}
