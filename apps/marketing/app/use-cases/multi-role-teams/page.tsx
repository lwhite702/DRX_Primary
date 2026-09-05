import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Multi-Role Teams Use Case | Deelrx CRM",
  description:
    "How DRX supports independent-retail teams with role boundaries and reviewable operating activity.",
};

export default function MultiRoleTeamsUseCasePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Multi-role teams</h1>
      <SectionBlock title="What this does">
        <p>
          Aligns staff execution through role boundaries, reviewable actions, and
          shared operating context.
        </p>
      </SectionBlock>
      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Mixed-role teams fail when everyone can do everything and no one owns
          outcomes.
        </p>
      </SectionBlock>
      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Role permissions restrict settings, inventory, and report access.</li>
          <li>Inventory adjustments and supported customer account actions retain user context.</li>
          <li>Help/support flow is available in app for issue escalation.</li>
        </ul>
      </SectionBlock>
      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>Team invite lifecycle is still less visible than core role management.</p>
        <CtaRow location="use_case_multi_role" secondaryLabel="See beta" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
