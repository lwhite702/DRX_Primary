import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { featurebaseHelpdeskUrl } from "@/lib/featurebase-links";

export const metadata: Metadata = {
  title: "Resources | Deelrx CRM",
  description:
    "Operator guides, beta updates, and customer-facing changelog for DRX.",
};

export default function ResourcesHubPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Resources</h1>

      <SectionBlock title="What this does">
        <p>
          Gives operators practical guides, release visibility, and beta context
          in one place.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Teams adopt faster when docs explain real workflows, common mistakes,
          and limits without marketing fluff.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Link className="rounded-xl border border-border p-4 hover:border-neon-lime/40" href="/resources/guides">
            <p className="font-semibold text-white">Guides</p>
            <p className="mt-1 text-sm text-text-secondary">Operational how-to content.</p>
          </Link>
          <Link
            className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
            href={featurebaseHelpdeskUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <p className="font-semibold text-white">Help Desk</p>
            <p className="mt-1 text-sm text-text-secondary">Featurebase support knowledge base.</p>
          </Link>
          <Link
            className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
            href="/updates/changelog"
          >
            <p className="font-semibold text-white">Changelog (Embedded)</p>
            <p className="mt-1 text-sm text-text-secondary">In-app Featurebase changelog view.</p>
          </Link>
          <Link
            className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
            href="/updates/roadmap"
          >
            <p className="font-semibold text-white">Roadmap (Embedded)</p>
            <p className="mt-1 text-sm text-text-secondary">In-app Featurebase roadmap view.</p>
          </Link>
          <Link className="rounded-xl border border-border p-4 hover:border-neon-lime/40" href="/beta">
            <p className="font-semibold text-white">Beta details</p>
            <p className="mt-1 text-sm text-text-secondary">Current release posture and limits.</p>
          </Link>
        </div>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>
          Content set is focused on live workflows only. Coverage expands with
          shipped functionality.
        </p>
        <CtaRow location="resources_hub" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
