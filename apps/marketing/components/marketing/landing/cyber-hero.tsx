import Link from "next/link";

import { DemoCard } from "@/components/marketing/landing/demo-primitives";
import {
  heroCustomerRows,
  heroQueueRows,
  heroQueueRowsDone,
} from "@/components/marketing/landing/demo-data";
import { cyberHeroCopy } from "@/components/marketing/landing/cyber-data";
import { appLoginUrl, appWaitlistUrl } from "@/lib/app-links";

export function CyberHero() {
  return (
    <section id="why" className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-32 lg:pt-36">
      <div
        className="pointer-events-none absolute left-1/2 top-20 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-neon-lime/5 blur-[120px]"
        aria-hidden
      />

      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="technical-label text-neon-lime">{cyberHeroCopy.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-sans text-[clamp(2.4rem,7vw,5.4rem)] font-bold uppercase leading-[0.95] tracking-[-0.04em] text-white">
            {cyberHeroCopy.heading}
            <span className="mt-3 block bg-gradient-to-r from-neon-lime to-white/70 bg-clip-text text-transparent">
              {cyberHeroCopy.gradientEmphasis}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            {cyberHeroCopy.body}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {cyberHeroCopy.highlights.map((item) => (
              <span
                key={item}
                className="technical-label rounded-full border border-neon-lime/30 bg-neon-lime/10 px-3 py-1 text-[10px] text-neon-lime"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={appWaitlistUrl}
              className="neon-pulse-button rounded-full bg-neon-lime px-7 py-3 text-sm font-bold uppercase tracking-wide text-black"
            >
              Start Beta Access
            </Link>
            <Link
              href={appLoginUrl}
              className="rounded-full border border-white/10 bg-white/[0.02] px-7 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-neon-lime/30 hover:text-white"
            >
              Operator Login
            </Link>
          </div>

          <div className="mt-8 space-y-2">
            {cyberHeroCopy.supportingLines.map((line) => (
              <p key={line} className="text-sm text-white/65">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="cyber-float rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-[16px]">
            <div className="mb-4 flex items-center justify-between">
              <p className="technical-label text-[10px] text-neon-lime">POS + CRM SYSTEM</p>
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                <span className="h-2 w-2 rounded-full bg-neon-lime" />
              </div>
            </div>

            <div className="queue-card-wrap">
              <div className="queue-state queue-state-processing">
                <DemoCard data={heroQueueRows} className="h-full border border-white/10" />
              </div>
              <div className="queue-state queue-state-done">
                <DemoCard data={heroQueueRowsDone} className="h-full border border-neon-lime/20" />
              </div>
            </div>

            <DemoCard data={heroCustomerRows} className="mt-4 border border-white/10" />

            <p className="mt-4 text-sm leading-relaxed text-white/65">{cyberHeroCopy.proofLine}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
