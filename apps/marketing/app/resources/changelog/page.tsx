import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Changelog | Deelrx CRM",
  description:
    "Customer-facing release notes for DRX product and workflow changes.",
};

const entries = [
  {
    date: "2026-02-14",
    version: "0.4.12",
    impact: "Documentation and marketing IA realignment for waitlist-first beta funnel.",
    areas: ["Marketing routes", "Legal hub", "Beta messaging"],
  },
  {
    date: "2026-02-12",
    version: "0.4.11",
    impact: "Operational stability and governance updates in app stack and docs.",
    areas: ["Dashboard", "Governance docs", "Build reliability"],
  },
  {
    date: "2026-02-09",
    version: "0.4.10",
    impact: "Improved 404 handling and reliability work.",
    areas: ["Routing", "PWA behavior"],
  },
];

export default function ChangelogPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Changelog</h1>

      <SectionBlock title="What this does">
        <p>Tracks customer-visible release changes tied to product versions.</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Ops teams need clear change context before rolling updates to staff.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={`${entry.version}-${entry.date}`} className="rounded-xl border border-border p-4">
              <p className="text-sm text-neon-lime">{entry.date} · v{entry.version}</p>
              <p className="mt-1 font-semibold text-white">{entry.impact}</p>
              <p className="mt-1 text-sm text-text-secondary">Areas: {entry.areas.join(", ")}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>Entry detail is focused on customer-visible impact and may omit internal refactors.</p>
        <CtaRow location="resources_changelog" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
