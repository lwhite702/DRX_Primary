import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Customers & Credit | Deelrx CRM",
  description:
    "Current DRX customer and credit workflows: profiles, balances, extensions, and payments.",
};

export default function CustomersCreditPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Customers & credit</h1>

      <SectionBlock title="What this does">
        <p>
          Manages customer records, linked sale history, and credit account
          activity in one workflow.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Credit risk and follow-up discipline break down fast when customer
          records are incomplete or disconnected.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Customer creation requires first name and at least one contact method.</li>
          <li>Customer detail view includes sales/credit metrics and AI credit panel.</li>
          <li>Credit management supports extension and payment recording flows.</li>
          <li>Outstanding balances and limit data are surfaced in credit overview.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Advanced automation/messaging is not part of current customer flow.</li>
          <li>Permission quality still determines safe credit operations.</li>
        </ul>
        <CtaRow
          location="product_customers_credit"
          secondaryLabel="See guide"
          secondaryHref="/resources/guides/credit-and-payments"
        />
      </SectionBlock>
    </PageFrame>
  );
}
