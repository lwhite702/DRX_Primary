import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Guide: Privacy Presets and Team Roles | Deelrx CRM",
  description:
    "Step-by-step guide for privacy preset configuration and team role management in DRX.",
};

export default function PrivacyRolesGuidePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Guide: Privacy presets and team roles</h1>

      <SectionBlock title="What this does">
        <p>Shows how to configure privacy posture and keep role access tight.</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Loose access controls turn simple mistakes into expensive ones.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Set privacy preset during onboarding.</li>
          <li>Open <strong>Settings → Manage Team</strong> for role assignment.</li>
          <li>Confirm restricted routes behave correctly per role.</li>
          <li>Review audit context after high-risk actions.</li>
        </ol>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Some role/permission UX is still maturing.</li>
          <li>No operator-facing one-click self-destruct action exists.</li>
        </ul>
        <CtaRow location="guide_privacy_roles" secondaryLabel="Team access page" secondaryHref="/product/team-access-security" />
      </SectionBlock>
    </PageFrame>
  );
}
