import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, PartyPopper } from "lucide-react";

import { MobileTestCompanion } from "@/components/marketing/site/android-test-companion";
import { PageFrame } from "@/components/marketing/site/page-frame";

export const metadata: Metadata = {
  title: "Mobile Internal Testing | Deelrx CRM",
  description: "A guided, privacy-safe companion for authorized DRX iOS and Android testers.",
  robots: { index: false, follow: false },
};

export default function MobileTestingPage() {
  return (
    <PageFrame className="p-0 md:p-0">
      <div className="overflow-hidden rounded-[28px]">
        <section className="relative border-b border-white/10 px-5 py-10 md:px-10 md:py-14">
          <div className="absolute right-[-80px] top-[-100px] size-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-accent">
              <PartyPopper aria-hidden="true" className="size-4" /> Mobile beta crew
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl">
              Let&apos;s give DRX a great test run.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
              Choose iOS or Android, test the installed app, then complete the required mobile-web pass on the same phone. You&apos;ll leave with one clean report the release team can act on.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="https://play.google.com/apps/internaltest/4701275532742360674" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-black shadow-[0_16px_32px_rgba(204,255,0,0.16)] transition hover:brightness-95">
                Android: join on Google Play <ExternalLink aria-hidden="true" className="size-4" />
              </Link>
              <Link href="https://apps.apple.com/app/testflight/id899247664" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-accent/50">
                iOS: open TestFlight <ExternalLink aria-hidden="true" className="size-4" />
              </Link>
              <a href="#test-companion" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:text-white">
                Start walkthrough <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-text-muted">
              Android requires a Google account in the Friends tester list. iOS requires the TestFlight invitation supplied by the release coordinator. Installed builds run without a development computer.
            </p>
          </div>
        </section>

        <section id="test-companion" className="scroll-mt-24 px-5 py-8 md:px-10 md:py-10">
          <MobileTestCompanion />
        </section>
      </div>
    </PageFrame>
  );
}

