import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Lawful Use Policy | Deelrx CRM",
  description:
    "Lawful-use policy for independent retailers and other lawful businesses using DRX.",
};

export default function LawfulUsePage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/lawful-use" />
      <h1 className="mb-8 text-4xl font-bold text-white">Lawful use policy</h1>

      <SectionBlock title="What this does">
        <p>
          Defines permitted and prohibited use of DRX for independent retail
          and other lawful business operations.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Clear boundaries protect operators and reduce misuse risk.
        </p>
      </SectionBlock>

      <SectionBlock title="Policy" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Use DRX only for lawful activity in your jurisdiction.</li>
          <li>
            Prohibited: unlicensed sales, diversion, fraudulent records, and
            any illegal activity.
          </li>
          <li>
            You are responsible for applicable local, state, and federal
            requirements.
          </li>
          <li>
            DRX is not legal, tax, lending, financial, or compliance advice.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>
          Policy guidance does not replace legal counsel.
        </p>
        <CtaRow location="legal_lawful_use" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
