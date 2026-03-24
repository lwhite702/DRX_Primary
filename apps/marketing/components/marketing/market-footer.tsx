"use client";

import Link from "next/link";
import Image from "next/image";
import { NeonButton } from "./neon-button";
import { SystemStatus } from "./system-status";
import { appWaitlistUrl } from "@/lib/app-links";

export function MarketFooter() {
  return (
    <footer className="relative overflow-hidden bg-black pb-12 pt-24">
      <div className="pointer-events-none absolute left-[-5%] top-[-10%] z-0 w-[120%] select-none opacity-5">
        <Image
          src="/brand/drx-wordmark-color.svg"
          alt="Pixel Pronto watermark"
          width={2000}
          height={600}
          className="h-auto w-full"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center px-6 md:px-12">
        <div className="mb-24 max-w-4xl space-y-8 text-center">
          <h2 className="text-4xl font-sans font-bold tracking-tight text-white md:text-6xl">
            LAUNCH FASTER WITH PIXEL PRONTO.
          </h2>
          <p className="text-lg text-text-secondary">
            One clearer system for your website, lead capture, booking, payments, and managed
            support.
          </p>
          <div className="flex justify-center">
            <Link href={appWaitlistUrl}>
              <NeonButton className="px-12 py-6 text-xl">Start your launch</NeonButton>
            </Link>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-12 border-t border-white/10 pt-12 md:grid-cols-3">
          <div className="space-y-4">
            <div className="inline-block bg-neon-lime px-2 py-1 font-mono text-xs font-bold uppercase text-black">
              Pixel Pronto
            </div>
            <p className="max-w-xs text-sm text-text-muted">
              Fast-launch website and business system for small businesses that need to get online
              and start earning sooner.
            </p>
            <SystemStatus />
          </div>

          <div className="space-y-4 md:text-center">
            <div className="mb-4 font-mono text-sm uppercase tracking-widest text-white/50">
              Legal
            </div>
            <div className="flex flex-col gap-6 font-mono text-base uppercase text-text-secondary md:flex-row md:justify-center">
              <Link href="/legal/privacy" className="transition-colors hover:text-neon-lime">
                Privacy
              </Link>
              <Link href="/legal/terms" className="transition-colors hover:text-neon-lime">
                Terms of Service
              </Link>
              <Link
                href="/legal/regulatory-disclaimer"
                className="transition-colors hover:text-neon-lime"
              >
                Regulatory Disclaimer
              </Link>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between space-y-4 md:items-end">
            <div className="font-mono text-xs uppercase tracking-widest text-white/40">Support</div>
            <p className="max-w-xs text-right text-sm text-text-muted">
              Need a cleaner path than a slow agency or a pile of disconnected tools? Pixel Pronto
              is built to keep launch simple.
            </p>
            <div className="text-xs font-mono text-text-muted">© 2026 PIXEL PRONTO.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
