import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, HelpCircle, Laptop, ShieldCheck, Smartphone } from "lucide-react";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { appBaseUrl } from "@/lib/app-links";
import { supportMailto } from "@/lib/docs-links";

export const metadata: Metadata = {
  title: "Resources | DRX",
  description: "Simple links for using, testing, and getting help with DRX.",
};

const cardClass = "group rounded-3xl border border-white/10 bg-surface p-5 transition hover:border-accent/45 md:p-6";

export default function ResourcesHubPage() {
  return (
    <PageFrame>
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black px-5 py-9 md:px-9 md:py-12">
        <div className="pointer-events-none absolute right-[-5rem] top-[-7rem] size-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">DRX resources</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white md:text-6xl">Everything you need to get moving.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
            Open DRX, join a phone test, or ask for help. Pick what you came here to do and we&apos;ll point you the right way.
          </p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="testing-heading">
        <div className="rounded-[28px] border border-accent/30 bg-accent/[0.06] p-5 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-black"><Smartphone className="size-6" aria-hidden="true" /></div>
              <h2 id="testing-heading" className="mt-5 text-2xl font-bold text-white md:text-3xl">Helping us test DRX?</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary md:text-base">
                Our friendly test companion walks you through sign-in, first-time setup, products, customers, sales, offline checks, and one quick phone-browser test. Your progress saves on your phone.
              </p>
            </div>
            <Link href="/resources/mobile-testing" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-black">
              Start the test <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="open-heading">
        <h2 id="open-heading" className="text-2xl font-bold text-white">Open DRX</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Use the version that fits where you&apos;re working today.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Link href={appBaseUrl} className={cardClass}>
            <Laptop className="size-6 text-accent" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold text-white">Use DRX on the web</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Sign in from a phone, tablet, or computer browser.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Open DRX <ExternalLink className="size-4" aria-hidden="true" /></span>
          </Link>
          <Link href="https://play.google.com/apps/internaltest/4701275532742360674" target="_blank" rel="noopener noreferrer" className={cardClass}>
            <Smartphone className="size-6 text-accent" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold text-white">Android test app</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Open this with the Google account that received your tester invite.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Get the Android app <ExternalLink className="size-4" aria-hidden="true" /></span>
          </Link>
          <Link href="https://apps.apple.com/app/testflight/id899247664" target="_blank" rel="noopener noreferrer" className={cardClass}>
            <Smartphone className="size-6 text-accent" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold text-white">iPhone and iPad test app</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Install TestFlight, then open the DRX invite we sent you.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Get TestFlight <ExternalLink className="size-4" aria-hidden="true" /></span>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Help and policies">
        <a href={supportMailto} className={cardClass}>
          <HelpCircle className="size-6 text-accent" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-white">Need a hand?</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Email the DRX team. Tell us what you were trying to do and what got in the way—no passwords or real customer details.</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Email support <ArrowRight className="size-4" aria-hidden="true" /></span>
        </a>
        <div className={cardClass}>
          <ShieldCheck className="size-6 text-accent" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-white">Privacy and terms</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">See how DRX handles information and the rules for using the service.</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-accent">
            <Link href="/legal/privacy">Privacy Policy</Link>
            <Link href="/legal/terms">Terms of Service</Link>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
