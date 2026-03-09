import Link from "next/link";

import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import {
  cyberFeaturePills,
  cyberPrimaryFeatureCards,
} from "@/components/marketing/landing/cyber-data";
import { appWaitlistUrl } from "@/lib/app-links";

const cardLayout = [
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-2",
] as const;

export function CyberBento() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-20">
      <div className="mb-8">
        <p className="technical-label text-neon-lime">Operator Feature Set</p>
        <h2 className="mt-4 font-sans text-[clamp(2rem,4.8vw,3.4rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em] text-white">
          Everything You Need For A Clean Shift.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/72">
          DRX keeps the core loop straightforward: sell quickly, keep stock accurate,
          track customer activity, and hold team actions accountable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-3">
        <article className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-[16px] md:col-span-2 md:row-span-2">
          <p className="technical-label text-[10px] text-neon-lime">Core Platform</p>
          <h3 className="mt-3 text-3xl font-bold uppercase tracking-tight text-white">
            Built For Operators, Not Corporate Workflows.
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
            Keep checkout moving while inventory, customer activity, and team actions
            stay visible in one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {cyberFeaturePills.map((pill) => (
              <span
                key={pill}
                className="technical-label rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] text-white/70"
              >
                {pill}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-[2.5rem] border border-neon-lime/40 bg-neon-lime p-7 text-black md:col-span-1 md:row-span-1">
          <p className="technical-label text-[10px] text-black/70">Priority Access</p>
          <h3 className="mt-3 text-2xl font-bold uppercase leading-tight">
            Roll Out DRX In Your Store.
          </h3>
          <p className="mt-3 text-sm text-black/80">
            Get early access, run live checkout, and help shape the operator roadmap.
          </p>
          <Link
            href={appWaitlistUrl}
            className="mt-6 inline-flex rounded-full border border-black/20 bg-black px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-neon-lime transition-transform hover:scale-[1.03]"
          >
            Reserve Spot
          </Link>
        </article>

        {cyberPrimaryFeatureCards.map((section, index) => (
          <article
            key={section.id}
            className={`rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-[16px] ${cardLayout[index]}`}
          >
            <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/72">{section.intro}</p>

            <ul className="mt-4 space-y-2">
              {section.bullets.slice(0, 3).map((bullet) => (
                <li key={`${section.id}-${bullet.text}`} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-white/80">{bullet.text}</span>
                  <FeatureStatusChip status={bullet.status} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
