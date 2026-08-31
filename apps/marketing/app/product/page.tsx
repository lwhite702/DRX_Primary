import type { Metadata } from "next";

import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { TrackedLink } from "@/components/marketing/site/tracked-link";
import {
  marketingFeatureSections,
  productHubCards,
} from "@/lib/feature-canon";

export const metadata: Metadata = {
  title: "Product | DRX",
  description:
    "Sales, stock, customers, balances, reports, and team access for people who actually run the business.",
};

export default function ProductHubPage() {
  return (
    <PageFrame>
      <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">What DRX Does</h1>
      <p className="mb-8 max-w-3xl text-text-secondary">
        Keep the count right. Keep the line moving. Skip the software nonsense.
      </p>

      <SectionBlock title="What you can do">
        <div className="grid gap-3 md:grid-cols-2">
          {productHubCards.map((item) => (
            <TrackedLink
              key={item.href}
              href={item.href}
              eventName="click_product_detail"
              payload={{ href: item.href }}
              className="rounded-xl border border-border p-4 transition-colors hover:border-neon-lime/40"
            >
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{item.desc}</p>
            </TrackedLink>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="What's ready" className="mt-6">
        <ul className="space-y-2">
          {marketingFeatureSections.map((section) => {
            const sectionStatus = section.bullets.some((bullet) => bullet.status === "planned")
              ? "planned"
              : section.bullets.some((bullet) => bullet.status === "beta")
                ? "beta"
                : "live";

            return (
              <li key={section.id} className="flex items-start justify-between gap-2">
                <span className="font-medium text-white">{section.title}</span>
                <FeatureStatusChip status={sectionStatus} />
              </li>
            );
          })}
        </ul>
        <CtaRow
          location="product_hub"
          secondaryLabel="Read beta terms"
          secondaryHref="/beta"
        />
      </SectionBlock>
    </PageFrame>
  );
}
