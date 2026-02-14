import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ShellLayout } from "@/components/marketing/shell-layout";
import { Hero } from "@/components/marketing/hero";
import { BentoGrid, BentoGridItem } from "@/components/marketing/bento-grid";
import { MarketFooter } from "@/components/marketing/market-footer";
import { SystemStatus } from "@/components/marketing/system-status";
import { Zap, ShieldCheck, BarChart4, Layers } from "lucide-react";
import { appWaitlistUrl } from "@/lib/app-links";

export const metadata: Metadata = {
  title: "Deelrx CRM | Run your floor. Know your numbers. Keep control.",
  description:
    "Deelrx CRM is built for owner/operators who need clear checkout, inventory, customer, and credit workflows.",
};

export default function LandingPage() {
  return (
    <main className="bg-black min-h-screen">
      <div className="noise-overlay" />

      <ShellLayout>
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
            <Link href="/product" className="text-white/70 hover:text-neon-lime transition-colors text-sm font-medium">
              Product
            </Link>
            <Link href="/use-cases" className="text-white/70 hover:text-neon-lime transition-colors text-sm font-medium">
              Use Cases
            </Link>
            <Link href="/resources" className="text-white/70 hover:text-neon-lime transition-colors text-sm font-medium">
              Resources
            </Link>
            <Link href="/beta" className="text-neon-lime transition-colors text-sm font-semibold">
              Beta
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <SystemStatus className="hidden md:flex" />
            <div className="w-2 h-2 rounded-full bg-neon-lime animate-pulse md:hidden"></div>
          </div>
        </nav>

        <Hero />

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

        <section className="px-6 py-24 bg-white/5 border-y border-white/5 mb-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Leave the remembering to us.
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
              You should not have to remember everything. If it happened, it is
              tracked.
            </p>
          </div>
        </section>

        <section className="px-6 pb-24 relative z-10">
          <div className="max-w-7xl mx-auto mb-12">
            <h3 className="text-sm font-mono text-neon-lime uppercase tracking-widest mb-4">
              Features
            </h3>
          </div>
          <BentoGrid>
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

            <BentoGridItem
              span={1}
              title="Inventory"
              description="Intake, adjustments, and audit context."
              header={
                <div className="h-32 w-full bg-surface-elevated rounded-xl mb-4 border border-white/5 flex items-end justify-between px-4 pb-4">
                  <div className="w-2 h-12 bg-white/10 rounded-t"></div>
                  <div className="w-2 h-24 bg-neon-lime rounded-t shadow-[0_0_10px_rgba(204,255,0,0.5)]"></div>
                  <div className="w-2 h-16 bg-white/10 rounded-t"></div>
                </div>
              }
              icon={<Layers className="w-6 h-6" />}
            />

            <BentoGridItem
              span={1}
              title="Credit"
              description="Track balances and payments clearly."
              header={
                <div className="h-32 w-full bg-surface-elevated rounded-xl mb-4 border border-white/5 flex items-center justify-center">
                  <span className="font-mono text-neon-lime text-2xl font-bold">
                    $0.00
                  </span>
                </div>
              }
              icon={<BarChart4 className="w-6 h-6" />}
            />

            <BentoGridItem
              span={2}
              title="Customers"
              description="Keep records clean and connected to sales."
              className="md:col-span-2"
              icon={<Zap className="w-6 h-6" />}
              header={<div className="h-24 w-full bg-white/5 rounded-xl border border-white/5" />}
            />

            <BentoGridItem
              span={2}
              title="Operations Visibility"
              description="Dashboard and Event Desk Board for daily control."
              className="md:col-span-2"
              icon={<BarChart4 className="w-6 h-6" />}
              header={<div className="h-24 w-full bg-white/5 rounded-xl border border-white/5" />}
            />

            <BentoGridItem
              span={2}
              title="Team Access and Safety"
              description="Role-based access with audit context."
              className="md:col-span-2 bg-surface-elevated/50"
              icon={<ShieldCheck className="w-6 h-6" />}
              header={
                <div className="h-24 w-full flex items-center gap-4 opacity-50 overflow-hidden">
                  <span className="font-mono text-xs text-neon-lime whitespace-nowrap">
                    ROLE_GUARDS // AUDIT_CONTEXT // OFFLINE_SYNC_QUEUE
                  </span>
                </div>
              }
            />
          </BentoGrid>
        </section>

        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto rounded-2xl border border-neon-lime/30 bg-neon-lime/5 p-8 md:p-12">
            <p className="text-xs font-mono uppercase tracking-widest text-neon-lime mb-4">
              Beta Access
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              DRX is in beta. Get full access details and request rollout.
            </h2>
            <p className="text-text-secondary text-lg max-w-3xl mb-8">
              Read the full beta section for expectations, current limitations,
              and support flow. Then join the signup list for staged access.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/beta"
                className="rounded-full border border-neon-lime/40 px-6 py-3 text-sm font-semibold text-neon-lime hover:bg-neon-lime/10"
              >
                See full beta page
              </Link>
              <Link
                href={appWaitlistUrl}
                className="rounded-full bg-neon-lime px-6 py-3 text-sm font-bold uppercase tracking-wide text-black hover:brightness-95"
              >
                Join beta waitlist
              </Link>
            </div>
          </div>
        </section>

        <MarketFooter />
      </ShellLayout>
    </main>
  );
}
