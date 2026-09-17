import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";
import { SmsConsentForm } from "@/components/marketing/forms/sms-consent-form";

export const metadata: Metadata = {
  title: "SMS Communication Consent | Deelrx CRM",
  description:
    "Opt in to receive relevant text message communications, account updates, and operator support from DRX (Deelrx CRM) by Wrelik Brands LLC.",
  alternates: { canonical: "/sms-consent" },
};

export default function SmsConsentPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/sms-consent" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC · DRX Messaging Program
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">SMS Communication Consent</h1>
      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
        This consent form allows operators, authorized business users, and customers to opt in to
        receive relevant text message (SMS) communications from{" "}
        <strong className="text-white">Wrelik Brands LLC</strong> for{" "}
        <strong className="text-white">DRX (Deelrx CRM)</strong>.
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-2">Opt In for Relevant Communications</h2>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          Provide your contact information and mobile phone number below to receive relevant
          communications, such as account alerts, operational shift notices, order and delivery
          updates, and customer support follow-ups.
        </p>

        <SmsConsentForm />
      </div>

      <SectionBlock title="Campaign & Messaging Details" className="mt-8">
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-text-secondary">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold text-white mb-1">Registered Brand</h3>
            <p>Wrelik Brands LLC (DRX / Deelrx CRM)</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold text-white mb-1">Message Types</h3>
            <p>Relevant communications: account notices, shift/system alerts, and support responses.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold text-white mb-1">Cost Disclosure</h3>
            <p>Message and data rates may apply. Check with your wireless carrier for plan details.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold text-white mb-1">Opt-Out &amp; Support</h3>
            <p>Text STOP to unsubscribe at any time. Text HELP for help or email support@deelrxcrm.com.</p>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Privacy & Data Protection" className="mt-6">
        <p className="text-sm text-text-secondary leading-relaxed">
          We take your privacy seriously. As detailed in our Privacy Policy,{" "}
          <strong className="text-white">
            we do not sell or share your SMS opt-in data or personal information with third parties
            for marketing purposes.
          </strong>{" "}
          Consent is not a condition of purchase or service.
        </p>
      </SectionBlock>

      <div className="mt-8 flex flex-wrap gap-4 text-sm border-t border-white/10 pt-6">
        <Link className="text-neon-lime hover:underline" href="/legal/privacy">
          Privacy Policy
        </Link>
        <span className="text-white/20">·</span>
        <Link className="text-neon-lime hover:underline" href="/legal/terms">
          Terms of Service
        </Link>
        <span className="text-white/20">·</span>
        <Link className="text-neon-lime hover:underline" href="/legal">
          Return to Legal Hub
        </Link>
      </div>
    </PageFrame>
  );
}
