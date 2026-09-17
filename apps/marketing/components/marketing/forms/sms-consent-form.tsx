"use client";

import { useState } from "react";
import Link from "next/link";
import { trackMarketingEvent } from "@/lib/analytics";

interface FormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  businessName: string;
  communicationTopic: string;
  consent: boolean;
}

const initialFormData: FormData = {
  fullName: "",
  phoneNumber: "",
  email: "",
  businessName: "",
  communicationTopic: "relevant_communications",
  consent: false,
};

export function SmsConsentForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    setFormData((prev) => ({ ...prev, phoneNumber: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const digitsOnly = formData.phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      setError("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    if (!formData.consent) {
      setError("You must review and check the SMS consent box to opt in.");
      return;
    }

    setLoading(true);

    try {
      // Send marketing event for analytics
      trackMarketingEvent("submit_sms_consent", {
        topic: formData.communicationTopic,
        hasBusinessName: Boolean(formData.businessName.trim()),
      });

      // Optional API post to record consent
      try {
        await fetch("/api/sms-consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            businessName: formData.businessName,
            communicationTopic: formData.communicationTopic,
            consent: true,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // Fallback gracefully on static builds
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-neon-lime/30 bg-neon-lime/10 p-6 md:p-8 text-white"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-lime text-black font-bold text-base">
            ✓
          </span>
          <h2 className="text-xl font-bold text-white">Consent Received</h2>
        </div>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed">
          Thank you, <strong className="text-white">{formData.fullName}</strong>. Your mobile
          number <strong className="text-white">{formData.phoneNumber}</strong> has been
          registered for relevant text message communications from{" "}
          <strong className="text-white">DRX (Deelrx CRM)</strong> operated by{" "}
          <strong className="text-white">Wrelik Brands LLC</strong>.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-text-secondary space-y-1.5">
          <p>
            <strong className="text-white">Message &amp; data rates may apply.</strong> Message
            frequency varies.
          </p>
          <p>
            Reply <strong className="text-white">HELP</strong> for support or email{" "}
            <a className="text-neon-lime hover:underline" href="mailto:support@deelrxcrm.com">
              support@deelrxcrm.com
            </a>.
          </p>
          <p>
            Reply <strong className="text-white">STOP</strong> at any time to cancel your text
            messaging subscription.
          </p>
          <p>Carriers are not liable for delayed or undelivered messages.</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
          <Link
            href="/legal/privacy"
            className="text-neon-lime hover:underline underline-offset-4"
          >
            Campaign Privacy Policy
          </Link>
          <span className="text-white/20">·</span>
          <Link
            href="/legal/terms"
            className="text-neon-lime hover:underline underline-offset-4"
          >
            Campaign Terms of Service
          </Link>
          <span className="text-white/20">·</span>
          <button
            type="button"
            onClick={() => {
              setFormData(initialFormData);
              setSubmitted(false);
            }}
            className="text-text-muted hover:text-white underline underline-offset-4"
          >
            Register another number
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 text-left" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm text-text-secondary">
          <span>
            Full name <span className="text-neon-lime" aria-hidden="true">*</span>
          </span>
          <input
            required
            type="text"
            name="fullName"
            autoComplete="name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Jane Doe"
            className="rounded-lg border border-border bg-black/40 px-3.5 py-2.5 text-white placeholder:text-text-muted focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-text-secondary">
          <span>
            Mobile phone number <span className="text-neon-lime" aria-hidden="true">*</span>
          </span>
          <input
            required
            type="tel"
            name="phoneNumber"
            autoComplete="tel"
            value={formData.phoneNumber}
            onChange={handlePhoneChange}
            placeholder="(555) 000-0000"
            className="rounded-lg border border-border bg-black/40 px-3.5 py-2.5 text-white placeholder:text-text-muted focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm text-text-secondary">
          <span>
            Email address <span className="text-neon-lime" aria-hidden="true">*</span>
          </span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="operator@example.com"
            className="rounded-lg border border-border bg-black/40 px-3.5 py-2.5 text-white placeholder:text-text-muted focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-text-secondary">
          <span>Business or organization (optional)</span>
          <input
            type="text"
            name="businessName"
            autoComplete="organization"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder="Retail Store / Enterprise"
            className="rounded-lg border border-border bg-black/40 px-3.5 py-2.5 text-white placeholder:text-text-muted focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime"
          />
        </label>
      </div>

      <label className="grid gap-1.5 text-sm text-text-secondary">
        <span>Communication purpose</span>
        <select
          name="communicationTopic"
          value={formData.communicationTopic}
          onChange={(e) => setFormData({ ...formData, communicationTopic: e.target.value })}
          className="rounded-lg border border-border bg-black/40 px-3.5 py-2.5 text-white focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime"
        >
          <option value="relevant_communications">
            Relevant Communications (Account alerts, shift updates, support follow-ups)
          </option>
          <option value="support_only">Customer Support &amp; Technical Follow-ups</option>
          <option value="onboarding_updates">Onboarding &amp; Service Setup Notices</option>
        </select>
      </label>

      {/* Mandatory Unchecked Consent Checkbox */}
      <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-4">
        <label className="flex items-start gap-3 cursor-pointer text-xs text-text-secondary leading-relaxed">
          <input
            required
            type="checkbox"
            name="consent"
            checked={formData.consent}
            onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border bg-black/50 text-neon-lime accent-neon-lime focus:ring-neon-lime"
          />
          <span>
            By checking this box and providing your phone number, you agree to receive recurring
            automated and manual text messages (SMS) from{" "}
            <strong className="text-white">Wrelik Brands LLC</strong> and{" "}
            <strong className="text-white">DRX (Deelrx CRM)</strong> regarding relevant
            communications, account updates, customer support, and operational notices.
            Consent is not a condition of purchase or service. Message and data rates may apply.
            Message frequency varies. Reply STOP to cancel at any time, or HELP for help. Carriers
            are not liable for delayed or undelivered messages. I have read and agree to the{" "}
            <Link
              href="/legal/terms"
              className="text-neon-lime underline hover:text-neon-lime/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="text-neon-lime underline hover:text-neon-lime/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex min-h-[48px] items-center justify-center rounded-full bg-neon-lime px-8 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-neon-lime/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-lime focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {loading ? "Submitting..." : "Opt In to SMS Communications"}
      </button>

      {/* Direct Campaign Links for 10DLC Reviewers */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-text-muted">
        <span className="text-text-secondary font-medium">Campaign Legal Links:</span>
        <div className="flex items-center gap-4">
          <Link
            href="/legal/privacy"
            className="text-neon-lime hover:underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          <span className="text-white/20">·</span>
          <Link
            href="/legal/terms"
            className="text-neon-lime hover:underline underline-offset-4"
          >
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </form>
  );
}
