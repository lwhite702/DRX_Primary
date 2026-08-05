import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Regulatory Disclaimer | Deelrx CRM",
  description:
    "Regulatory and legal-responsibility boundaries for businesses using DRX.",
};

export default function RegulatoryDisclaimerPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/regulatory-disclaimer" />
      <h1 className="mb-8 text-4xl font-bold text-white">Regulatory disclaimer</h1>

      <SectionBlock title="What this does">
        <p>
          Clarifies legal, tax, financial, and operational responsibility when
          a business uses DRX.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Software supports daily operations but does not replace professional
          advice or business judgment.
        </p>
      </SectionBlock>

      <SectionBlock title="Disclaimer" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>DRX is an operational system, not legal advice.</li>
          <li>
            Activity records provide operational context and are not certified
            legal, accounting, or regulatory records.
          </li>
          <li>
            Businesses remain responsible for licensing, taxes, reporting,
            customer account policies, and lawful conduct.
          </li>
          <li>
            DRX is not a lender, payment network, debt collector, or legal,
            tax, financial, or compliance advisor.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>
          This disclaimer may evolve as legal review and product scope evolve.
        </p>
        <CtaRow location="legal_regulatory_disclaimer" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
