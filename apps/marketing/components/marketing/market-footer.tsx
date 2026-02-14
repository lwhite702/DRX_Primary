"use client";

import Link from "next/link";
import Image from "next/image";
import { NeonButton } from "./neon-button";
import { SystemStatus } from "./system-status";

const appLoginUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app"}/login`;

export function MarketFooter() {
  return (
    <footer className="relative bg-black pt-32 pb-12 overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute top-[-10%] left-[-5%] w-[120%] opacity-5 pointer-events-none select-none z-0">
        <Image
          src="/brand/drx-wordmark-color.svg"
          alt="DRX Watermark"
          width={2000}
          height={600}
          className="w-full h-auto"
        />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col items-center">
        {/* Primary CTA Area */}
        <div className="text-center mb-32 space-y-8 max-w-4xl">
          <h2 className="text-4xl md:text-6xl font-sans font-bold text-white tracking-tight">
            SYSTEM READY FOR DEPLOYMENT.
          </h2>
          <div className="flex justify-center">
            <Link href={appLoginUrl}>
              <NeonButton className="px-12 py-6 text-xl">
                Start Secure Session
              </NeonButton>
            </Link>
          </div>
        </div>

        {/* Footer Links & Info */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/10 pt-12">
          <div className="space-y-4">
            <div className="inline-block bg-neon-lime text-black px-2 py-1 font-mono font-bold text-xs uppercase">
              DEELRX CRM
            </div>
            <p className="text-text-muted text-sm max-w-xs">
              POS and Management for privacy-focused operations.
            </p>
            <SystemStatus />
          </div>

          <div className="space-y-4 md:text-center">
            <div className="font-mono text-sm text-white/50 uppercase tracking-widest mb-4">
              Legal
            </div>
            <div className="flex flex-col md:flex-row gap-6 md:justify-center font-mono text-base uppercase text-text-secondary">
              <Link
                href="/legal/privacy"
                className="hover:text-neon-lime transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/legal/terms"
                className="hover:text-neon-lime transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/legal/regulatory-disclaimer"
                className="hover:text-neon-lime transition-colors"
              >
                Regulatory Disclaimer
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-between h-full space-y-4">
            <div className="font-mono text-xs text-white/40 uppercase tracking-widest">
              Connect
            </div>
            <div className="flex gap-4">
              {/* Social placeholders */}
              <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer">
                𝕏
              </span>
              <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer">
                M
              </span>
            </div>
            <div className="text-text-muted text-xs font-mono">
              © 2026 DEELRX SYSTEMS.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
