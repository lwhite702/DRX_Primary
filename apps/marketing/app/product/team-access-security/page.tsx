import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Team Access & Security Controls | Deelrx CRM",
  description:
    "Current DRX controls: role permissions, access guards, privacy presets, audit context, and offline queue behavior.",
};

export default function TeamAccessSecurityPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Team access & security controls</h1>

      <SectionBlock title="What this does">
        <p>
          Uses role permissions, page guards, and privacy presets to limit who
          can perform sensitive actions.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Most operational data problems come from access sprawl and unclear
          responsibility, not tooling gaps.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Team management route allows controlled role updates.</li>
          <li>Role guards block restricted inventory and audit actions.</li>
          <li>Privacy preset is configured during onboarding.</li>
          <li>
            Offline queue stores supported transactions locally and syncs on
            reconnect.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>No operator-facing one-click self-destruct workflow.</li>
          <li>Safe operations still depend on role setup discipline.</li>
        </ul>
        <CtaRow
          location="product_team_access_security"
          secondaryLabel="See guide"
          secondaryHref="/resources/guides/privacy-presets-and-team-roles"
        />
      </SectionBlock>
    </PageFrame>
  );
}
