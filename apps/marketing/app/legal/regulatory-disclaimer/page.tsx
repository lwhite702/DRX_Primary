import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Regulatory Disclaimer | Deelrx CRM",
  description:
    "Regulatory disclaimer for dispensary operations and legal responsibility when using DRX.",
};

export default function RegulatoryDisclaimerPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/regulatory-disclaimer" />
      <h1 className="mb-8 text-4xl font-bold text-white">Regulatory disclaimer</h1>

      <SectionBlock title="What this does">
        <p>
          Clarifies legal responsibility and risk boundaries for regulated-use
          environments.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Software supports operations but does not substitute for legal or
          regulatory judgment.
        </p>
      </SectionBlock>

      <SectionBlock title="Disclaimer" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>DRX is an operational system, not legal advice.</li>
          <li>
            Audit records are operational evidence and do not override regulator
            direction.
          </li>
          <li>
            Operators remain responsible for licensing, reporting, and lawful
            business conduct.
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
