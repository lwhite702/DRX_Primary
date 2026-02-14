import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { TrackedLink } from "@/components/marketing/site/tracked-link";

export const metadata: Metadata = {
  title: "Product | Deelrx CRM",
  description:
    "Feature index for checkout, inventory, customers, credit, visibility, and role-based controls in Deelrx CRM.",
};

const productPages = [
  {
    href: "/product/sales-checkout",
    title: "Sales & checkout",
    desc: "Cart flow, payment methods, and sale detail controls.",
  },
  {
    href: "/product/inventory-control",
    title: "Inventory control",
    desc: "Intake, adjustment, audit history, and aliases.",
  },
  {
    href: "/product/customers-credit",
    title: "Customers & credit",
    desc: "Profiles, account balances, extensions, and payments.",
  },
  {
    href: "/product/operations-visibility",
    title: "Operations visibility",
    desc: "Operator Dashboard and Event Desk Board metrics.",
  },
  {
    href: "/product/team-access-security",
    title: "Team access & security controls",
    desc: "Role permissions, guardrails, privacy presets, and audit context.",
  },
];

export default function ProductHubPage() {
  return (
    <PageFrame>
      <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">Product</h1>
      <p className="mb-8 max-w-3xl text-text-secondary">
        Evidence-backed feature map based on current DRX workflows.
      </p>

      <SectionBlock title="What this does">
        <p>
          Breaks down each core operational area with current behavior,
          guardrails, and practical limits.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Operators can qualify fit fast without marketing noise or unsupported
          claims.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <div className="grid gap-3 md:grid-cols-2">
          {productPages.map((item) => (
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

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Beta release posture remains active.</li>
          <li>
            Reports exist as a route but are currently limited in output.
          </li>
        </ul>
        <CtaRow location="product_hub" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
