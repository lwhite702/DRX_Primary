import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Legal Hub | Deelrx CRM",
  description:
    "Legal and regulatory reference hub for privacy, terms, lawful-use policy, and disclaimers.",
};

export default function LegalHubPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal" />
      <h1 className="mb-8 text-4xl font-bold text-white">Legal hub</h1>

      <SectionBlock title="What this does">
        <p>Central access to legal and regulated-use reference pages.</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>Operators need legal context close to product decisions.</p>
      </SectionBlock>

      <SectionBlock title="Proof from live product behavior" className="mt-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/legal/privacy" className="rounded-xl border border-border p-4 hover:border-neon-lime/40">Privacy</Link>
          <Link href="/legal/terms" className="rounded-xl border border-border p-4 hover:border-neon-lime/40">Terms</Link>
          <Link href="/legal/lawful-use" className="rounded-xl border border-border p-4 hover:border-neon-lime/40">Lawful use</Link>
          <Link href="/legal/regulatory-disclaimer" className="rounded-xl border border-border p-4 hover:border-neon-lime/40">Regulatory disclaimer</Link>
          <Link href="/support" className="rounded-xl border border-border p-4 hover:border-neon-lime/40">Support</Link>
        </div>
      </SectionBlock>

      <SectionBlock title="What's in beta / current limitations" className="mt-6">
        <p>Legal language is updated as product and policy evolve.</p>
        <CtaRow location="legal_hub" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
