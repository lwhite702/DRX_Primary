import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";

export const metadata: Metadata = {
  title: "Store Manager Use Case | Deelrx CRM",
  description:
    "How DRX supports store managers with shift oversight, adjustment governance, and team access control.",
};

export default function StoreManagerUseCasePage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Store manager</h1>
      <SectionBlock title="What this does">
        <p>
          Supports shift-level oversight where managers handle sensitive actions
          and keep operating records clear.
        </p>
      </SectionBlock>
      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>
          Manager bottlenecks usually come from unclear permissions and weak
          activity review.
        </p>
      </SectionBlock>
      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <ul className="list-disc space-y-2 pl-5">
          <li>Team management route with role-change controls.</li>
          <li>Permission-gated inventory and adjustment actions.</li>
          <li>Sale history and optional customer account records for follow-up.</li>
        </ul>
      </SectionBlock>
      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>Access outcomes still depend on configuration quality by owner/admin.</p>
        <CtaRow location="use_case_store_manager" secondaryLabel="Read guide" secondaryHref="/resources/guides/privacy-presets-and-team-roles" />
      </SectionBlock>
    </PageFrame>
  );
}
