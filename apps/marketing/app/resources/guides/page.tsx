import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { TrackedLink } from "@/components/marketing/site/tracked-link";

export const metadata: Metadata = {
  title: "Guides | Deelrx CRM",
  description:
    "Operational guides for inventory, credit, payments, privacy presets, and team roles in DRX.",
};

export default function GuidesHubPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Guides</h1>

      <SectionBlock title="What this does">
        <p>Provides tactical guidance for the highest-impact DRX workflows.</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Clear runbooks reduce mistakes during live shifts.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <div className="grid gap-3 md:grid-cols-3">
          <TrackedLink
            href="/resources/guides/inventory-intake-and-adjustments"
            eventName="click_guide"
            payload={{ href: "/resources/guides/inventory-intake-and-adjustments" }}
            className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
          >
            Inventory intake and adjustments
          </TrackedLink>
          <TrackedLink
            href="/resources/guides/credit-and-payments"
            eventName="click_guide"
            payload={{ href: "/resources/guides/credit-and-payments" }}
            className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
          >
            Credit and payments
          </TrackedLink>
          <TrackedLink
            href="/resources/guides/privacy-presets-and-team-roles"
            eventName="click_guide"
            payload={{ href: "/resources/guides/privacy-presets-and-team-roles" }}
            className="rounded-xl border border-border p-4 hover:border-neon-lime/40"
          >
            Privacy presets and team roles
          </TrackedLink>
        </div>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>Guides are limited to live routes and currently shipped behavior.</p>
        <CtaRow location="guides_hub" secondaryLabel="See product" secondaryHref="/product" />
      </SectionBlock>
    </PageFrame>
  );
}
