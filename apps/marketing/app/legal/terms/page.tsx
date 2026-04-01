import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Terms of Service | Deelrx CRM",
  description: "Terms governing use of Deelrx CRM services.",
};

export default function LegalTermsPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/terms" />
      <h1 className="mb-8 text-4xl font-bold text-white">Terms of service</h1>

      <SectionBlock title="Summary">
        <p>
          Use of DRX is subject to these terms and applicable laws.
        </p>
      </SectionBlock>

      <SectionBlock title="Key points" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Service is provided under published policies and terms.</li>
          <li>Accounts may be restricted for policy or legal violations.</li>
          <li>Users are responsible for lawful use in their jurisdiction.</li>
          <li>Service availability and feature scope can evolve during beta.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="Related" className="mt-6">
        <CtaRow location="legal_terms" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
