import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Privacy Policy | Deelrx CRM",
  description: "Privacy policy for Deelrx CRM marketing and product usage.",
};

export default function LegalPrivacyPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/privacy" />
      <h1 className="mb-8 text-4xl font-bold text-white">Privacy policy</h1>

      <SectionBlock title="Summary">
        <p>
          This page explains what data is collected, how it is used, and how
          operators can request changes.
        </p>
      </SectionBlock>

      <SectionBlock title="Key points" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Operational data is processed to deliver platform functionality.</li>
          <li>Access is controlled by role and business context.</li>
          <li>Data handling includes security and audit safeguards.</li>
          <li>Deletion/access requests can be submitted through support channels.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="Contact" className="mt-6">
        <p>Email: privacy@deelrxcrm.com</p>
      </SectionBlock>

      <SectionBlock title="Related" className="mt-6">
        <CtaRow location="legal_privacy" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
