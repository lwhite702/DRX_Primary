import {
  BadgeDollarSign,
  Calculator,
  ClipboardCheck,
  Cloud,
  PackageCheck,
  ShoppingCart,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import {
  operatorShowcaseCanon,
  type OperatorShowcaseCardId,
} from "@/lib/feature-canon";

const iconMap: Record<OperatorShowcaseCardId, LucideIcon> = {
  "point-of-sale": ShoppingCart,
  inventory: PackageCheck,
  "customer-accounts": BadgeDollarSign,
  customers: UsersRound,
  pricing: Calculator,
  "anywhere-access": Cloud,
  "activity-control": ClipboardCheck,
};

export function OperatorsShowcaseSection() {
  return (
    <section className="border-y border-white/10 bg-[#0D0D0D]">
      <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {operatorShowcaseCanon.eyebrow}
            </p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-white md:text-6xl">
              {operatorShowcaseCanon.heading}
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
              {operatorShowcaseCanon.supportingLines.join(" ")}
            </p>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {operatorShowcaseCanon.cards.map((card) => {
              const Icon = iconMap[card.id];
              return (
                <div key={card.id} className="grid min-h-20 grid-cols-[40px_1fr_auto] items-center gap-4 py-4">
                  <span className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-[#1A1A1A] text-accent">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{card.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/45">{card.subtitle}</p>
                  </div>
                  <FeatureStatusChip status={card.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
