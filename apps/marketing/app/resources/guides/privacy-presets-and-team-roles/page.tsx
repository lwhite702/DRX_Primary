import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Guide: Privacy Profiles and Team Roles | Deelrx CRM",
  description:
    "Step-by-step guide for DRX privacy profile configuration, Vault Mode controls, and team role management.",
};

export default function PrivacyRolesGuidePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">
        Guide: Privacy profiles and team roles
      </h1>

      <SectionBlock title="What this does">
        <p>
          Shows how to configure your privacy posture with DRX Privacy ProteXion
          Protocol profiles, ProteXion screen privacy, and keep role access tight.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Loose access controls and excessive data collection turn simple
          mistakes into expensive incidents.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Select one of three onboarding privacy profiles:</li>
          <li>Alias Mode, Standard Mode, or Business CRM Mode.</li>
          <li>
            Open <strong>Settings → Privacy Protocol Dashboard</strong> to tune
            field visibility, retention, alias-only mode, and screen privacy behavior.
          </li>
          <li>Review Vault Mode status and Customer Data Inventory in Settings.</li>
          <li>Set ephemeral profile defaults (1, 7, or 30 days) for quick POS customers.</li>
          <li>
            Open <strong>Settings → Manage Team</strong> for role assignment and
            least-privilege controls.
          </li>
          <li>Confirm restricted routes and session controls per role.</li>
        </ol>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Some role and permission UX is still maturing.</li>
          <li>
            Retention cleanup runs on schedule and supports manual trigger, but
            hard-delete restore is not available in this phase.
          </li>
        </ul>
        <CtaRow
          location="guide_privacy_roles"
          secondaryLabel="Team access page"
          secondaryHref="/product/team-access-security"
        />
      </SectionBlock>
    </PageFrame>
  );
}
