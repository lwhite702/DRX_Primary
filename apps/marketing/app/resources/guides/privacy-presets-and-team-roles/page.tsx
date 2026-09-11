import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Guide: Privacy and Team Roles | Deelrx CRM",
  description:
    "Choose what customer details DRX saves, when to hide them, and what each team member can see.",
};

export default function PrivacyRolesGuidePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">
        Guide: Privacy and team roles
      </h1>

      <SectionBlock title="What this does">
        <p>
          Choose what customer details DRX saves, when to hide them, and what
          each team member can see.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Saving less and limiting access lowers the damage a mistake can cause.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Choose one of three privacy settings.</li>
          <li>Hide details, Protect details, or Keep details.</li>
          <li>
            Open <strong>Settings → Privacy</strong> to choose what is saved,
            when old records are deleted, and when details are hidden.
          </li>
          <li>Check protection status and what is saved.</li>
          <li>Choose when temporary customer records are deleted.</li>
          <li>
            Open <strong>Settings → Team</strong> to choose what each team
            member can do.
          </li>
          <li>Confirm restricted routes and session controls per role.</li>
        </ol>
      </SectionBlock>

      <SectionBlock
        title="What's in beta / current limitations"
        className="mt-6"
      >
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
