import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";

export const metadata: Metadata = {
  title: "Support | Deelrx CRM",
  description: "Contact Deelrx CRM support or find DRX privacy and legal information.",
};

export default function SupportPage() {
  return (
    <PageFrame>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">DRX support</p>
      <h1 className="mt-3 text-4xl font-bold text-white">Get help with Deelrx CRM</h1>
      <p className="mt-4 max-w-3xl text-text-secondary">
        Email the DRX team for product support, account access, privacy requests, or legal questions.
        Include your organization name, app version, and a short description of the issue. Do not
        send passwords, payment-card numbers, or other sensitive information.
      </p>

      <SectionBlock title="Email support" className="mt-8">
        <p>
          <a className="text-neon-lime hover:underline" href="mailto:support@deelrxcrm.com?subject=DRX%20support">
            support@deelrxcrm.com
          </a>
        </p>
        <p>
          Privacy and legal requests may also be sent to{" "}
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">
            legal@wrelik.com
          </a>.
        </p>
      </SectionBlock>

      <SectionBlock title="Policies" className="mt-6">
        <div className="flex flex-wrap gap-4">
          <Link className="text-neon-lime hover:underline" href="/legal/privacy">Privacy Policy</Link>
          <Link className="text-neon-lime hover:underline" href="/legal/terms">Terms of Use</Link>
          <Link className="text-neon-lime hover:underline" href="/legal">Legal hub</Link>
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
