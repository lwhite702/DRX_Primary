import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Guide: Add Stock and Fix Counts | Deelrx CRM",
  description:
    "Learn how to add stock, fix a count, and check stock history in DRX.",
};

export default function InventoryGuidePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">
        Guide: Inventory intake and adjustments
      </h1>

      <SectionBlock title="What this does">
        <p>
          Shows how to record stock intake, run corrections, and verify logs.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Most inventory errors come from skipped reasons and late updates.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open <strong>Inventory Intake</strong> and capture product, cost,
            and weight.
          </li>
          <li>
            Open <strong>Inventory Adjustment</strong> for add/remove/set
            corrections.
          </li>
          <li>Record a reason before confirming adjustment.</li>
          <li>
            Verify in <strong>Inventory Audit Log</strong> by product and
            timestamp.
          </li>
        </ol>
      </SectionBlock>

      <SectionBlock
        title="What's in beta / current limitations"
        className="mt-6"
      >
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Reporting pages for broader inventory analysis remain limited.
          </li>
          <li>Alias quality depends on each business setup.</li>
        </ul>
        <CtaRow
          location="guide_inventory"
          secondaryLabel="Products and stock"
          secondaryHref="/product/inventory-control"
        />
      </SectionBlock>
    </PageFrame>
  );
}
