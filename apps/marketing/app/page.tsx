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
      title: "Deelrx CRM | Built for Dispensaries.",
      description:
        "Manage customer accounts, track balances, monitor inventory, and see how your store is performing — all in one system designed for dispensary operators.",
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
              Dispensaries Don't Run Like Regular Retail.
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed">
              You're not just ringing up sales.<br />
              <br />
              You're tracking repeat customers.<br />
              You're managing account balances.<br />
              You're keeping an eye on inventory.<br />
              You're handling sensitive customer data.<br />
              You're making fast decisions every day.<br />
              <br />
              Most POS systems are built for grocery stores.<br />
              Most CRMs are built for sales teams.<br />
              <br />
              Neither understands how dispensaries operate.<br />
              <br />
              <span className="text-neon-lime">DeelRx CRM was built for this.</span>
            </p>
          </div>
        </section>

        <section className="px-6 py-24 bg-white/5 border-y border-white/5 mb-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              From Single Store to Multi-Location
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed max-w-3xl">
              Whether you run one shop or several, DeelRx CRM helps you stay organized and in control.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-lime mt-3"></div>
                <p className="text-lg text-white">Independent dispensaries</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-lime mt-3"></div>
                <p className="text-lg text-white">Boutique cannabis retailers</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-lime mt-3"></div>
                <p className="text-lg text-white">Delivery-focused operators</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-lime mt-3"></div>
                <p className="text-lg text-white">Growing multi-store teams</p>
              </div>
            </div>
            <p className="text-xl text-text-secondary mt-8">
              Start simple. Add more as you grow.
            </p>
          </div>
        </section>

        <section className="px-6 pb-24 relative z-10">
          <div className="max-w-7xl mx-auto mb-12">
            <h3 className="text-sm font-mono text-neon-lime uppercase tracking-widest mb-4">
              What You Can Do with DRX
            </h3>
          </div>
          <BentoGrid>
            <BentoGridItem
              span={2}
              title="Customer Accounts"
              description="See purchase history, balances, limits, and notes in one place."
              header={
                <div className="h-32 w-full bg-gradient-to-br from-neon-lime/20 to-transparent rounded-xl mb-4 border border-neon-lime/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(204,255,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(204,255,0,0.1)_1px,transparent_1px)] bg-[size:1rem_1rem]"></div>
                </div>
              }
              icon={<Zap className="w-6 h-6" />}
            />

            <BentoGridItem
              span={1}
              title="Balance & Credit Tracking"
              description="Know exactly who owes what and when."
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
              span={1}
              title="Inventory View"
              description="See what's moving and what's running low before it becomes a problem."
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
              span={2}
              title="Store Performance"
              description="Check sales numbers, customer activity, and trends at a glance."
              className="md:col-span-2"
              icon={<BarChart4 className="w-6 h-6" />}
              header={<div className="h-24 w-full bg-white/5 rounded-xl border border-white/5" />}
            />

            <BentoGridItem
              span={2}
              title="Secure Customer Data"
              description="Keep sensitive information protected and organized."
              className="md:col-span-2 bg-surface-elevated/50"
              icon={<ShieldCheck className="w-6 h-6" />}
              header={
                <div className="h-24 w-full flex items-center gap-4 opacity-50 overflow-hidden">
                  <span className="font-mono text-xs text-neon-lime whitespace-nowrap">
                    ENCRYPTED // ROLE_BASED // AUDIT_READY
                  </span>
                </div>
              }
            />
          </BentoGrid>
        </section>

        <section className="px-6 py-24 bg-white/5 border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-12 text-white">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-neon-lime/20 border-2 border-neon-lime/50 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-neon-lime" />
                </div>
                <p className="text-lg text-white">Customer walks in</p>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-12 h-0.5 bg-white/20"></div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-neon-lime/20 border-2 border-neon-lime/50 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-neon-lime" />
                </div>
                <p className="text-lg text-white">Pull up their account</p>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-12 h-0.5 bg-white/20"></div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-neon-lime/20 border-2 border-neon-lime/50 flex items-center justify-center mb-4">
                  <BarChart4 className="w-8 h-8 text-neon-lime" />
                </div>
                <p className="text-lg text-white">Check balance</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center mt-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-neon-lime/20 border-2 border-neon-lime/50 flex items-center justify-center mb-4">
                  <Layers className="w-8 h-8 text-neon-lime" />
                </div>
                <p className="text-lg text-white">Process sale</p>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-12 h-0.5 bg-white/20"></div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-neon-lime/20 border-2 border-neon-lime/50 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-neon-lime" />
                </div>
                <p className="text-lg text-white">Update inventory automatically</p>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="w-12 h-0.5 bg-white/20"></div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-neon-lime/20 border-2 border-neon-lime/50 flex items-center justify-center mb-4">
                  <BarChart4 className="w-8 h-8 text-neon-lime" />
                </div>
                <p className="text-lg text-white">Review daily performance</p>
              </div>
            </div>
            <p className="text-xl text-text-secondary mt-12 text-center">
              Make it feel fast and easy.
            </p>
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Simple to Start. Built to Grow.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <p className="text-xl text-text-secondary mb-4">
                  <strong className="text-white">Day one:</strong>
                </p>
                <div className="space-y-2">
                  <p className="text-lg text-white">• Track customers</p>
                  <p className="text-lg text-white">• Log sales</p>
                  <p className="text-lg text-white">• Monitor balances</p>
                </div>
              </div>
              <div>
                <p className="text-xl text-text-secondary mb-4">
                  <strong className="text-white">As you grow:</strong>
                </p>
                <div className="space-y-2">
                  <p className="text-lg text-white">• Add deeper reporting</p>
                  <p className="text-lg text-white">• Manage multiple locations</p>
                  <p className="text-lg text-white">• Get clearer insights into what's driving revenue</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto rounded-2xl border border-neon-lime/30 bg-neon-lime/5 p-8 md:p-12">
            <p className="text-xs font-mono uppercase tracking-widest text-neon-lime mb-4">
              Get Started
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Run Your Dispensary with Software That Actually Fits.
            </h2>
            <p className="text-text-secondary text-lg max-w-3xl mb-8">
              Stop forcing generic tools to do a dispensary's job.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={appWaitlistUrl}
                className="rounded-full bg-neon-lime px-6 py-3 text-sm font-bold uppercase tracking-wide text-black hover:brightness-95"
              >
                Start Your Free Trial
              </Link>
            </div>
          </div>
        </section>

        <MarketFooter />
      </ShellLayout>
    </main>
  );
}
