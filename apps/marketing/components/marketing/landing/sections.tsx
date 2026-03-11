import Link from "next/link";

import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import { appWaitlistUrl } from "@/lib/app-links";
import {
  drxPositioning,
  marketingFeatureSections,
} from "@/lib/feature-canon";

export function LandingHeroSection() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-8 px-6 pb-16 pt-28 md:grid-cols-2 md:pt-36">
      <div>
        <p className="technical-label text-neon-lime">{drxPositioning.brand}</p>
        <h1 className="headline-text mt-4 text-[clamp(2.1rem,7vw,5.4rem)] text-white">
          {drxPositioning.headline}
        </h1>
        <p className="body-copy mt-6 max-w-3xl text-lg text-text-secondary">
          {drxPositioning.summary}
        </p>

        <div className="mt-6 space-y-1">
          {drxPositioning.punchlines.map((line) => (
            <p key={line} className="body-copy text-sm text-text-secondary">
              {line}
            </p>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={appWaitlistUrl}
            className="neon-pulse-button inline-flex h-12 items-center px-7 text-sm font-semibold"
          >
            Join Beta Waitlist
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-effect rounded-[2rem] p-5">
          <p className="technical-label text-[11px] text-neon-lime">What DRX Does</p>
          <p className="body-copy mt-3 text-sm text-text-secondary">
            Just tools that help you sell, track, and grow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {marketingFeatureSections.slice(0, 4).map((section) => (
            <article key={section.id} className="luminosity-card rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {section.bullets.slice(0, 3).map((bullet) => (
                  <li
                    key={bullet.text}
                    className="flex items-start justify-between gap-2 text-xs text-white/85"
                  >
                    <span>{bullet.text}</span>
                    <FeatureStatusChip status={bullet.status} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingKeyBentoSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="grid gap-5 md:grid-cols-2">
        {marketingFeatureSections.slice(4).map((section) => (
          <article key={section.id} className="luminosity-card card-lift rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">{section.title}</h3>
              {section.bullets.some((bullet) => bullet.status !== "live") ? (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Mixed Status
                </span>
              ) : null}
            </div>
            <p className="body-copy mt-3 text-sm text-text-secondary">{section.intro}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet.text}
                  className="flex items-start justify-between gap-2 text-white/90"
                >
                  <span>{bullet.text}</span>
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
