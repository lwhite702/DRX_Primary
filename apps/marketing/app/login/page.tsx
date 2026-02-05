"use client";

import Link from "next/link";
import Image from "next/image";
import { ShellLayout } from "@/components/marketing/shell-layout";
import { NeonButton } from "@/components/marketing/neon-button";
import { GlassCard } from "@/components/marketing/glass-card";
import { SystemStatus } from "@/components/marketing/system-status";
import { cn } from "@deelrx/ui";

export default function LoginPage() {
  return (
    <main className="bg-black min-h-screen">
      <div className="noise-overlay" />

      <ShellLayout className="items-center justify-center">
        {/* Navigation */}
        <nav className="absolute top-0 left-0 w-full z-50 px-6 py-6 md:px-12 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/brand/drx-wordmark-color.svg"
              alt="DRX"
              width={240}
              height={80}
              className="h-24 w-auto group-hover:drop-shadow-[0_0_8px_rgba(204,255,0,0.5)] transition-all"
            />
            <span className="font-mono text-xs text-white/50 group-hover:text-neon-lime transition-colors">
              // RETURN_TO_ROOT
            </span>
          </Link>
          <SystemStatus />
        </nav>

        <div className="w-full max-w-md relative z-10 px-6">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              SYSTEM ACCESS
            </h1>
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest">
              Authorized Personnel Only
            </p>
          </div>

          <GlassCard className="space-y-6 p-8 border-white/5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  className="text-xs font-mono uppercase text-neon-lime tracking-wider"
                  htmlFor="email"
                >
                  Operator ID / Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime transition-all font-mono text-sm"
                  placeholder="operator@deelrx.com"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-xs font-mono uppercase text-neon-lime tracking-wider"
                  htmlFor="password"
                >
                  Passkey
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime transition-all font-mono text-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <NeonButton fullWidth className="py-3 text-base">
              Authenticate
            </NeonButton>

            <div className="text-center">
              <span className="text-xs text-text-muted">
                Forgot credentials?{" "}
                <a href="#" className="text-neon-lime hover:underline">
                  Reset secure token
                </a>
              </span>
            </div>
          </GlassCard>

          <div className="mt-8 flex justify-center gap-2">
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
          </div>
        </div>
      </ShellLayout>
    </main>
  );
}
