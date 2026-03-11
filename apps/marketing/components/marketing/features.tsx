import {
  BarChart3,
  Boxes,
  CreditCard,
  Shield,
  Smartphone,
  Store,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import {
  marketingFeatureSections,
  type FeatureSection,
} from "@/lib/feature-canon";

const iconBySection: Record<FeatureSection["id"], LucideIcon> = {
  "fast-pos": Zap,
  "quick-pos": Smartphone,
  inventory: Boxes,
  customers: Users,
  reports: BarChart3,
  "team-control": Shield,
  "multi-location": Store,
  "desktop-mobile": CreditCard,
};

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="mb-8">
        <h2 className="headline-text text-3xl text-white md:text-4xl">What DRX Does</h2>
        <p className="body-copy mt-3 max-w-3xl text-text-secondary">
          No bloated menus. No complicated setup. No enterprise energy.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {marketingFeatureSections.map((section) => {
          const Icon = iconBySection[section.id];

          return (
            <article
              key={section.id}
              className="luminosity-card card-lift rounded-[2rem] border border-border/60 p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neon-lime/15 text-neon-lime">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-semibold text-white">{section.title}</h3>
              </div>

              <p className="body-copy text-sm text-text-secondary">{section.intro}</p>

              <ul className="mt-4 space-y-2">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet.text}
                    className="flex items-start justify-between gap-2 text-sm text-white/90"
                  >
                    <span>{bullet.text}</span>
                    <FeatureStatusChip status={bullet.status} />
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
