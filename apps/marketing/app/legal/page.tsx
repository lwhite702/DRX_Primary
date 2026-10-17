import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";
import { FaqAccordion } from "@/components/marketing/rebuild/faq-accordion";

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

      <SectionBlock title="Frequently Asked Legal & Compliance Questions" className="mt-8">
        <p className="mb-6 text-sm text-text-secondary leading-relaxed">
          Common questions regarding commercial retail boundaries, data retention, customer privacy rights, and regulatory compliance. For detailed operational workflows, consult the{" "}
          <a
            href="https://docs.deelrxcrm.com/legal-faq"
            className="text-neon-lime hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            DRX Help Center Legal FAQ
          </a>
          .
        </p>
        <FaqAccordion
          items={[
            {
              question: "Does DRX calculate and file sales taxes for retail merchants?",
              answer:
                "No. DRX records operator-entered tax rates on receipts and daily summaries. Merchants are responsible for calculating, reporting, and remitting all applicable municipal, state, and federal taxes.",
            },
            {
              question: "Is DRX certified for medical dispensaries or prescription pharmacy workflows?",
              answer:
                "No. DRX is designed for lawful general regulated retail. It is not healthcare or pharmacy dispensing software and does not support HIPAA-covered clinical records.",
            },
            {
              question: "Does DRX or Wrelik Brands LLC sell customer mobile numbers or store records?",
              answer:
                "Never. We maintain a strict zero-sale policy. Customer phone numbers and transaction records are never sold, rented, or shared with third-party marketers or data brokers. Data is processed solely by authorized infrastructure service providers to operate the platform and deliver store services in accordance with our Terms.",
            },
            {
              question: "How do retail customers request data access or profile deletion?",
              answer:
                "Customers can submit a verified request directly to their store or through support@deelrxcrm.com. Personal identifiers are permanently deleted from active systems, while anonymous sales ledger totals are preserved to satisfy statutory tax accounting requirements.",
            },
            {
              question: "How does DRX respond to law enforcement requests or subpoenas?",
              answer:
                "Wrelik Brands LLC complies with valid, lawful legal process only after thorough review by designated legal counsel. We do not volunteer store records, and all customer data is protected by multi-tenant isolation and AES-256 encryption.",
            },
            {
              question: "How does automated retention cleanup affect store records?",
              answer:
                "Store operators can configure retention policy thresholds to delete inactive customer records after 30, 180, or 365 days. The cleanup routine permanently removes eligible customer records while automatically preserving profiles linked to open sales or active store credit balances.",
            },
          ]}
        />
      </SectionBlock>

      <SectionBlock title="Data Protection & Operator Governance" className="mt-8">
        <p className="text-sm text-text-secondary leading-relaxed">
          DRX is built on a privacy-first, minimal-data architectural foundation with TLS 1.3 encryption in transit, AES-256 encryption at rest, field-level encryption for sensitive identifiers, and automated data retention cleanup. Store operators retain full control over customer data retention parameters and daily reconciliation exports.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link className="text-neon-lime hover:underline" href="/legal/privacy#privacy-rights">
            Exercise Privacy Rights
          </Link>
          <a
            className="text-neon-lime hover:underline"
            href="https://docs.deelrxcrm.com/privacy/data-requests-and-legal-holds"
            target="_blank"
            rel="noopener noreferrer"
          >
            Operator Data Requests Runbook
          </a>
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
