import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Owner/Operator Use Case | Deelrx CRM",
  description:
    "How DRX supports independent-retail owner-operators with fast checkout, stock visibility, and clear customer records.",
};

export default function OwnerOperatorUseCasePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Owner/operator</h1>
      <SectionBlock title="What this does">
        <p>
          Gives owner-operators a clear working loop across sales, stock,
          customer records, and team access.
        </p>
      </SectionBlock>
      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          You need fewer blind spots, not more dashboards.
        </p>
      </SectionBlock>
      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Fast checkout with multiple payment methods.</li>
          <li>Inventory intake, adjustment, and activity views in dedicated routes.</li>
          <li>Customer purchase history and optional store account records.</li>
          <li>Event Desk Board visibility during live operations.</li>
        </ul>
      </SectionBlock>
      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>Some reporting depth is still maturing in current release.</p>
        <CtaRow location="use_case_owner_operator" secondaryLabel="See product" secondaryHref="/product" />
      </SectionBlock>
    </PageFrame>
  );
}
