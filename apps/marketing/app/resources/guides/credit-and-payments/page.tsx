import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Guide: Store Accounts and Payments | Deelrx CRM",
  description:
    "Step-by-step guide for payment method handling and optional merchant-managed store account records in DRX.",
};

export default function CreditPaymentsGuidePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Guide: Store accounts and payments</h1>

      <SectionBlock title="What this does">
        <p>Explains transaction tender records and optional store account updates.</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Recordkeeping mistakes create reconciliation drift and customer disputes.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Pick payment method in <strong>Sales</strong>.</li>
          <li>Add reference details for <strong>Zelle</strong> where needed.</li>
          <li>Complete checkout and review <strong>Sale Details</strong> if edits are needed.</li>
          <li>Use <strong>Credit Management</strong> in the current product for store account and payment records.</li>
        </ol>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Store account actions have role restrictions by design.</li>
          <li>Advanced report depth is still limited.</li>
          <li>Store accounts are merchant recordkeeping and are not presented as a consumer financial product.</li>
        </ul>
        <CtaRow location="guide_credit_payments" secondaryLabel="Sales & checkout page" secondaryHref="/product/sales-checkout" />
      </SectionBlock>
    </PageFrame>
  );
}
