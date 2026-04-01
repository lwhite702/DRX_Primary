import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Beta Access and Use | Deelrx CRM",
  description:
    "Current beta access model, operating expectations, and known limitations for DRX.",
};

export default function BetaPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Beta access and use</h1>

      <SectionBlock title="What this does">
        <p>
          Defines current beta posture, access expectations, and support path.
        </p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Beta gives faster iteration but requires clear expectations for rollout
          and staff training.
        </p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Current app shell displays beta status indicators.</li>
          <li>Feature controls and role guards gate access by context.</li>
          <li>In-app support issue submission is available for operators.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Some workflows are still evolving between releases.</li>
          <li>Reporting depth is currently limited in the reports route.</li>
        </ul>
        <CtaRow location="beta_page" secondaryLabel="See guides" secondaryHref="/resources/guides" />
      </SectionBlock>
    </PageFrame>
  );
}
