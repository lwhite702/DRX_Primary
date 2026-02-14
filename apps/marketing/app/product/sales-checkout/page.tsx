import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Sales & Checkout | Deelrx CRM",
  description:
    "Current DRX checkout behavior: cart controls, payment methods, and sale detail constraints.",
};

export default function SalesCheckoutPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Sales & checkout</h1>

      <SectionBlock title="What this does">
        <p>
          Handles carting, customer assignment, taxes/fees, and payment capture
          in the <strong>Sales</strong> flow.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Checkout is where stock, customer balance, and revenue all change at
          once. Errors here cause the most shift pain.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Cart supports quantity updates, removal, and customer linking.</li>
          <li>
            Supported payment methods: Cash, Card, Credit, Zelle, and Mixed.
          </li>
          <li>
            Sale detail route supports payment updates and customer assignment
            with role constraints.
          </li>
          <li>
            Delivery options and additional fee handling are present in current
            flow.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Certain reassignment actions are restricted for credit sales.</li>
          <li>Workflow behavior can change as beta hardening continues.</li>
        </ul>
        <CtaRow
          location="product_sales_checkout"
          secondaryLabel="See guide"
          secondaryHref="/resources/guides/credit-and-payments"
        />
      </SectionBlock>
    </PageFrame>
  );
}
