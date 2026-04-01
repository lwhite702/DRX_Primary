import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Guide: Credit and Payments | Deelrx CRM",
  description:
    "Step-by-step guide for payment method handling and credit account updates in DRX.",
};

export default function CreditPaymentsGuidePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Guide: Credit and payments</h1>

      <SectionBlock title="What this does">
        <p>Explains transaction payment capture and credit account updates.</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Payment mistakes create reconciliation drift and credit disputes.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Pick payment method in <strong>Sales</strong>.</li>
          <li>Add reference details for <strong>Zelle</strong> where needed.</li>
          <li>Complete checkout and review <strong>Sale Details</strong> if edits are needed.</li>
          <li>Use <strong>Credit Management</strong> for extension and payment actions.</li>
        </ol>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Credit reassignment has role restrictions by design.</li>
          <li>Advanced report depth is still limited.</li>
        </ul>
        <CtaRow location="guide_credit_payments" secondaryLabel="Sales & checkout page" secondaryHref="/product/sales-checkout" />
      </SectionBlock>
    </PageFrame>
  );
}
