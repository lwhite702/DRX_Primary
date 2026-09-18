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
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC
      </p>
      <h1 className="mb-4 mt-2 text-4xl font-bold text-white md:text-5xl">Legal Hub</h1>
      <p className="mb-8 max-w-3xl text-base text-text-secondary leading-relaxed">
        Authoritative legal, privacy, and regulatory policies governing DRX (also presented as Deelrx CRM) by Wrelik Brands LLC.
      </p>

      <SectionBlock title="Policies and Agreements">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/legal/privacy"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Privacy Policy</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              How Wrelik Brands LLC collects, uses, protects, and retains operator and customer data. Includes our strict zero-third-party SMS marketing data sharing commitment.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Privacy Policy →</span>
          </Link>

          <Link
            href="/legal/terms"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Terms of Service</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Terms of Use governing platform access, including the complete SMS Terms, carrier disclosures, STOP/HELP keywords, and the DRX commercial addendum.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Terms of Service →</span>
          </Link>

          <Link
            href="/sms-consent"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">SMS Communication Consent</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Opt-in submission form for receiving relevant operational notices, security alerts, and customer support follow-ups via text messaging.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">View SMS Consent Form →</span>
          </Link>

          <Link
            href="/legal/lawful-use"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Lawful Use Policy</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Permitted operations and non-negotiable prohibitions. Ensures DRX is used exclusively for lawful, compliant retail and commercial activity.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Lawful Use Policy →</span>
          </Link>

          <Link
            href="/legal/regulatory-disclaimer"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40 md:col-span-2"
          >
            <h2 className="text-lg font-bold text-white">Regulatory Disclaimer</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Clarifies legal, tax, and licensing boundaries. DRX is an operational operating system and does not provide legal, tax, financial, or healthcare advice.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Regulatory Disclaimer →</span>
          </Link>
        </div>
      </SectionBlock>

      <SectionBlock title="Beta & Early Access Terms" className="mt-8">
        <p className="text-sm text-text-secondary leading-relaxed">
          During early access and preview periods, features evolve continuously. Subscribing businesses maintain responsibility for local compliance, record exports, and tax reporting.
        </p>
        <CtaRow location="legal_hub" secondaryLabel="Read beta terms" secondaryHref="/beta" />
      </SectionBlock>
    </PageFrame>
  );
}
