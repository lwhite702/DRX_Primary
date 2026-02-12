"use client";

import Link from "next/link";
import { NeonButton } from "./neon-button";
import { SystemStatus } from "./system-status";
import { GlassCard } from "./glass-card";

const appLoginUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app"}/login`;

export function Hero() {
  return (
    <section className="relative px-6 py-20 md:py-32 w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        {/* Left: Typography & Action (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-px w-8 bg-neon-lime/50"></div>
            <span className="font-mono uppercase text-sm tracking-[0.2em] text-neon-lime">
              System / DRX_Primary
            </span>
          </div>

          <h1 className="headline-text text-6xl sm:text-7xl md:text-[7.5rem] leading-[0.85] tracking-[-0.06em] text-white">
            RUN YOUR <br />
            <span className="text-neon-lime">BUSINESS.</span> <br />
            <span className="opacity-50">OWN YOUR DATA.</span>
          </h1>

          <p className="text-xl md:text-2xl text-text-secondary max-w-xl font-light leading-relaxed">
            Deelrx CRM tracks your money and your stock. No noise. Just a clear
            view of your business.
          </p>

          <div className="pt-8">
            <Link href={appLoginUrl}>
              <NeonButton>Start Now</NeonButton>
            </Link>
          </div>
        </div>

        {/* Right: Floating Interface (5 cols) */}
        <div className="lg:col-span-5 relative h-[500px] hidden md:block">
          <div className="relative w-full h-full">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-neon-lime/5 rounded-full blur-3xl transform translate-x-10 translate-y-10"></div>

            {/* Main Floating Card - POS Snapshot */}
            <GlassCard className="absolute top-10 left-0 w-full z-10 animate-[float_6s_ease-in-out_infinite]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <SystemStatus status="ONLINE" />
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">TRANS_ID</span>
                  <span className="text-white">#992-AX-01</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">SPEED</span>
                  <span className="text-neon-lime">INSTANT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">NET_SETTLE</span>
                  <span className="text-white font-bold">$12,450.00</span>
                </div>
              </div>
            </GlassCard>

            {/* Secondary Floating Card - Behind */}
            <GlassCard className="absolute bottom-20 right-[-20px] w-3/4 z-0 opacity-50 scale-95 blur-[2px] animate-[float_8s_ease-in-out_infinite_reverse]">
              <div className="h-full w-full flex items-center justify-center">
                <span className="font-mono text-xs text-white/30 uppercase tracking-widest">
                  Encrypted Stream Active
                </span>
              </div>
            </GlassCard>

            <div className="absolute -bottom-10 -right-10 font-mono text-[10rem] font-bold text-white/5 pointer-events-none select-none">
              01
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
