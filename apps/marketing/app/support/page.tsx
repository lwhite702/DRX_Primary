import type { Metadata } from "next";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";

export const metadata: Metadata = {
  title: "Support | Deelrx CRM",
  description: "Get help with Deelrx CRM accounts, onboarding, and product workflows.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">Support</h1>
      <SectionBlock title="How can we help?">
        <p>
          For account, onboarding, or product help, email{" "}
          <a className="underline" href="mailto:support@deelrxcrm.com">
            support@deelrxcrm.com
          </a>
          .
        </p>
      </SectionBlock>
      <SectionBlock title="Policies" className="mt-6">
        <p>
          Privacy and terms are available publicly from the{" "}
          <a className="underline" href="/legal">
            legal center
          </a>
          .
        </p>
      </SectionBlock>
    </PageFrame>
  );
}
