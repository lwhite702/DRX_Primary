import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Inventory Control | Deelrx CRM",
  description:
    "Current DRX inventory workflows: list, intake, adjustment, audit history, and aliases.",
};

export default function InventoryControlPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Inventory control</h1>

      <SectionBlock title="What this does">
        <p>
          Supports product management through <strong>Inventory</strong>,
          <strong> Inventory Intake</strong>, <strong>Inventory Adjustment</strong>,
          and <strong>Inventory Audit Log</strong>.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Clean stock history keeps checkout moving and limits end-of-shift
          disputes.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Dedicated intake route captures cost/weight and supplier context.</li>
          <li>Adjustment route requires action type, quantity, and reason.</li>
          <li>Audit log route shows transaction history by product and user.</li>
          <li>Settings include business-specific product alias management.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Some bulk/reporting surfaces are still limited.</li>
          <li>Role permissions must be configured correctly for safe operation.</li>
        </ul>
        <CtaRow
          location="product_inventory_control"
          secondaryLabel="See guide"
          secondaryHref="/resources/guides/inventory-intake-and-adjustments"
        />
      </SectionBlock>
    </PageFrame>
  );
}
