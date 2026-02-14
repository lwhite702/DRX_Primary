import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Operations Visibility | Deelrx CRM",
  description:
    "Current DRX visibility surfaces: Operator Dashboard and Event Desk Board metrics.",
};

export default function OperationsVisibilityPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Operations visibility</h1>

      <SectionBlock title="What this does">
        <p>
          Gives live operational context through <strong>Operator Dashboard</strong>
          and <strong>Event Desk Board</strong>.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Shift teams need to spot pressure early: low stock, pending intake,
          slow collections, and unusual movement.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Dashboard exposes current business snapshot and recent activity.</li>
          <li>Event Desk Board shows sales totals, average sale, and inventory alerts.</li>
          <li>Credit and intake metrics are included in current board logic.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Reports route is currently limited and not a full BI surface.</li>
          <li>Visibility should be interpreted with active business/date context.</li>
        </ul>
        <CtaRow
          location="product_operations_visibility"
          secondaryLabel="See guide"
          secondaryHref="/resources/guides/privacy-presets-and-team-roles"
        />
      </SectionBlock>
    </PageFrame>
  );
}
