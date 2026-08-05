import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Use Cases | Deelrx CRM",
  description:
    "Independent-retail use cases for owner-operators, store managers, and multi-role teams in DRX.",
};

const useCases = [
  {
    href: "/use-cases/owner-operator",
    title: "Owner/operator",
    desc: "Line speed, stock visibility, customer records, and control.",
  },
  {
    href: "/use-cases/store-manager",
    title: "Store manager",
    desc: "Shift oversight, adjustment governance, and role discipline.",
  },
  {
    href: "/use-cases/multi-role-teams",
    title: "Multi-role teams",
    desc: "Permission clarity, consistent workflows, and reviewable activity.",
  },
];

export default function UseCasesHubPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Use cases</h1>

      <SectionBlock title="What this does">
        <p>
          Maps DRX workflows to the independent-retail teams that run them day to day.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Different roles care about different failure points. Use-case paths
          keep evaluation practical.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <div className="grid gap-3 md:grid-cols-3">
          {useCases.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
            >
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{item.desc}</p>
            </Link>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>
          Role outcomes depend on initial setup quality. Beta hardening can
          adjust workflows between releases.
        </p>
        <CtaRow location="use_cases_hub" secondaryLabel="See product" secondaryHref="/product" />
      </SectionBlock>
    </PageFrame>
  );
}
