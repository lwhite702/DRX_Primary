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
            href="/legal/terms"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Terms of Service</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Binding terms of use governing platform access, enterprise customer obligations, complete SMS carrier rules, and the DRX commercial operating addendum.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Terms of Service →</span>
          </Link>

          <Link
            href="/legal/privacy"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Privacy Policy</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              How Wrelik Brands LLC encrypts, protects, and retains operator and customer records. Details our encryption architecture, law enforcement response policy, and zero third-party SMS sharing commitment.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Privacy Policy →</span>
          </Link>

          <Link
            href="/legal/lawful-use"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Lawful Commercial Use Policy</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Mandatory commercial retail compliance, strict prohibitions against illicit sales, age-verification obligations, and actionable operator tips to keep your retail store legally compliant.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Lawful Use Policy →</span>
          </Link>

          <Link
            href="/legal/regulatory-disclaimer"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Regulatory &amp; Operational Disclaimer</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Statutory non-advice boundaries, strict pharmacy and healthcare disclaimers, sales tax calculation limits, and distinction between operational logs and certified financial audits.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Regulatory Disclaimer →</span>
          </Link>

          <Link
            href="/beta"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">Beta Software Agreement &amp; Disclaimer</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Terms governing participation in early access previews, Apple TestFlight builds, and Android pilot programs. Covers &quot;AS-IS&quot; disclaimers, merchant backup mandates, and fictional test data rules.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">Read Beta Software Terms →</span>
          </Link>

          <Link
            href="/sms-consent"
            className="rounded-xl border border-border bg-surface-elevated/40 p-5 transition-all hover:border-accent/40"
          >
            <h2 className="text-lg font-bold text-white">SMS Communication Consent</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Verifiable opt-in submission form for receiving operational system notices, critical delivery updates, and customer support follow-ups via text messaging.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold text-accent">View SMS Consent Form →</span>
          </Link>
        </div>
      </SectionBlock>

      <SectionBlock title="Data Protection & Operator Governance" className="mt-8">
        <p className="text-sm text-text-secondary leading-relaxed">
          DRX is built on a privacy-first, minimal-data architectural foundation with TLS 1.3 encryption in transit, AES-256 encryption at rest, field-level encryption for sensitive identifiers, and automated data retention cleanup. Store operators retain full control over customer data retention parameters and daily reconciliation exports.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link className="text-neon-lime hover:underline" href="/legal/privacy#privacy-rights">
            Exercise Privacy Rights
          </Link>
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">
            Contact Wrelik Legal
          </a>
          <a className="text-neon-lime hover:underline" href="mailto:support@deelrxcrm.com">
            Contact Customer Support
          </a>
        </div>
      </SectionBlock>
    </PageFrame>
  );
}
