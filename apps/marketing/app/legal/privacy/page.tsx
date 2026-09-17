import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Privacy Policy | Deelrx CRM",
  description:
    "How Wrelik Brands LLC and Deelrx CRM collect, use, disclose, retain, and protect information.",
  alternates: { canonical: "/legal/privacy" },
};

const sectionClassName = "mt-6";
const listClassName = "list-disc space-y-2 pl-5";

export default function LegalPrivacyPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/privacy" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">Privacy Policy</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Effective September 3, 2026 · Last updated September 3, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        This policy applies to DRX, also presented as Deelrx CRM, including its
        websites, web application, and native mobile applications.
      </p>

      <SectionBlock title="1. Scope and roles" className={sectionClassName}>
        <p>
          DRX is a privacy-first operating system for regulated retail businesses.
          This policy explains how Wrelik Brands LLC (&quot;Wrelik,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) handles personal information when people visit
          our public website or use DRX.
        </p>
        <p>
          A subscribing business generally controls the customer, inventory,
          transaction, and workforce records its authorized users enter into DRX.
          Wrelik processes those records to provide the service. Wrelik separately
          determines how information is used for account administration, security,
          billing, compliance, support, and protection of the service.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Information DRX processes" className={sectionClassName}>
        <p>Depending on the features a business and its authorized users use, DRX may process:</p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Account and operator information:</strong>{" "}
            names, email addresses, authentication and user identifiers, business
            membership, roles, permissions, account settings, and security events.
          </li>
          <li>
            <strong className="text-white">Business information:</strong> business
            name, locations, owner and staff records, configuration, subscription,
            and operational settings.
          </li>
          <li>
            <strong className="text-white">Retail customer information:</strong>{" "}
            aliases, names, phone numbers, email addresses, delivery or contact
            addresses, notes, purchase history, loyalty information, balances,
            payments, credit limits, and age-verification details when a business
            chooses to record them.
          </li>
          <li>
            <strong className="text-white">Product and inventory information:</strong>{" "}
            product names and descriptions, categories, SKUs, vendors, batch records,
            quantities, units, costs, prices, adjustments, and regulated-product
            attributes such as THC or CBD percentages where applicable.
          </li>
          <li>
            <strong className="text-white">Sales and financial records:</strong>{" "}
            carts, line items, amounts, discounts, taxes, tender type, limited payment
            references, credit balances and repayments, refunds, voids, deliveries,
            reconciliation records, and audit history. DRX is not designed to store
            full payment-card or bank-account credentials.
          </li>
          <li>
            <strong className="text-white">Device, usage, and diagnostics:</strong>{" "}
            app version, device and operating-system information, IP-derived network
            information, Android or DRX installation identifiers, push-notification
            tokens, feature interactions, crash reports, error logs, and performance
            diagnostics. The Android app does not request a device&apos;s precise GPS
            location.
          </li>
          <li>
            <strong className="text-white">Communications:</strong> support requests,
            feedback, and other messages a user chooses to send.
          </li>
        </ul>
        <p>
          Businesses and users should not enter full payment-card data, Social
          Security numbers, protected health information, or other information DRX
          is not expressly designed to process.
        </p>
      </SectionBlock>

      <SectionBlock title="3. How information is collected" className={sectionClassName}>
        <p>We receive information:</p>
        <ul className={listClassName}>
          <li>directly from visitors, account holders, and authorized business users;</li>
          <li>from the business that creates or administers an authorized user&apos;s account;</li>
          <li>automatically from the app, browser, device, and connected services; and</li>
          <li>from integrations that a business or authorized user chooses to enable.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="4. How information is used" className={sectionClassName}>
        <p>We use information to:</p>
        <ul className={listClassName}>
          <li>provide, synchronize, support, and improve DRX;</li>
          <li>authenticate users and enforce business, tenant, role, and permission boundaries;</li>
          <li>process inventory, sales, balances, deliveries, reports, and user-directed workflows;</li>
          <li>support encrypted offline operation and reconcile approved offline transactions;</li>
          <li>send requested service and delivery notifications;</li>
          <li>measure feature use, diagnose failures, prevent abuse, and secure the service;</li>
          <li>respond to support, privacy, and account requests;</li>
          <li>comply with law, enforce agreements, and protect legal rights; and</li>
          <li>communicate material service, security, account, or policy changes.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="5. Mobile and offline storage" className={sectionClassName}>
        <p>
          The DRX mobile app stores authentication material and a tenant-scoped
          operator session in protected device storage. On Android, approved offline
          workflows can store encrypted cached product and customer records, offline
          authorization data, pending sales, receipts, and delivery reminders in a
          SQLCipher database. The Android application disables operating-system backup
          for its app data.
        </p>
        <p>
          Offline data is synchronized when connectivity returns. Transaction and
          audit records may be retained when needed to preserve financial correctness,
          prevent duplicate processing, resolve a conflict, or meet a business or legal
          recordkeeping obligation.
        </p>
      </SectionBlock>

      <SectionBlock title="6. Service providers and disclosure" className={sectionClassName}>
        <p>DRX uses providers that process information to operate the service, including:</p>
        <ul className={listClassName}>
          <li><strong className="text-white">Clerk</strong> for authentication and account sessions;</li>
          <li><strong className="text-white">Convex</strong> for the operational application backend and database;</li>
          <li><strong className="text-white">Vercel</strong> for web hosting and application delivery;</li>
          <li><strong className="text-white">Expo and Google</strong> for mobile build, distribution, device services, and push notifications;</li>
          <li><strong className="text-white">PostHog</strong> for product analytics, with mobile session replay disabled; and</li>
          <li><strong className="text-white">Sentry</strong> for crash, error, and performance diagnostics, as well as user-initiated in-app feedback.</li>
        </ul>
        <p>We may also disclose information:</p>
        <ul className={listClassName}>
          <li>to the subscribing business and its authorized users according to configured access;</li>
          <li>to an integration or other recipient at a business&apos;s or authorized user&apos;s direction;</li>
          <li>when reasonably necessary to comply with law, protect rights or safety, investigate abuse, or enforce agreements;</li>
          <li>to professional advisers that are required to protect the information; or</li>
          <li>as part of a financing, merger, acquisition, reorganization, bankruptcy, or sale of assets, subject to appropriate safeguards.</li>
        </ul>
        <p>
          We do not sell personal information for money and do not use personal
          information for cross-context behavioral advertising. Service providers may
          process information only to provide contracted services or as otherwise
          permitted by their agreements and applicable law.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Analytics, diagnostics, and AI" className={sectionClassName}>
        <p>
          PostHog and Sentry may receive technical identifiers, device or app
          information, feature interactions, crash data, and diagnostic context. We
          configure mobile session replay off and prohibit intentionally placing retail
          customer contact details, sale line items, payment references, or free-form
          business records in analytics events. Diagnostic reports can still contain
          information associated with an authorized user, so access is restricted.
        </p>
        <p>
          When an authorized user invokes an AI-assisted feature, the selected input,
          instructions, and necessary tenant-scoped context may be sent to configured
          AI infrastructure and model providers to return the requested result. DRX AI
          output is advisory and must not be the sole basis for a legally significant
          credit, employment, eligibility, or compliance decision.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Retention, export, and deletion" className={sectionClassName}>
        <p>
          We retain information for as long as reasonably necessary to provide DRX,
          follow the subscribing business&apos;s instructions and configured retention
          settings, maintain security and auditability, meet contractual and legal
          obligations, and resolve disputes. Encrypted backups and limited logs can
          retain copies until their scheduled rotation.
        </p>
        <p>
          A verified deletion request may remove, de-identify, mask, or archive account
          and profile information. Some transaction, inventory, balance, tax, audit,
          fraud-prevention, legal-hold, and dispute records cannot be deleted immediately
          without compromising required records or other people&apos;s rights. We limit and
          protect retained information and remove it when the applicable need ends.
        </p>
        <p>
          A subscribing business controls ordinary access, correction, export, and
          deletion requests for the business records it entered into DRX. Retail
          customers and organization-managed users should contact that business first.
          Wrelik will assist as required by contract and law.
        </p>
      </SectionBlock>

      <SectionBlock title="9. Security" className={sectionClassName}>
        <p>
          We use safeguards designed to protect information, including encrypted
          network transport, authentication, server-side tenant and role authorization,
          encrypted storage for designated sensitive fields, protected mobile storage,
          audit trails, provider controls, and environment separation. No system is
          completely secure. Users must protect their credentials and devices and
          promptly report suspected unauthorized access.
        </p>
      </SectionBlock>

      <div id="privacy-rights" className="scroll-mt-24" />
      <SectionBlock title="10. Privacy rights and account requests" className={sectionClassName}>
        <p>
          Depending on the applicable law and our role, a person may have rights to
          access, correct, delete, or receive a portable copy of information; restrict
          or object to certain processing; withdraw consent; or appeal a denied request.
          We may verify identity, account control, and authority before acting.
        </p>
        <p>
          For a Wrelik-controlled account or website request, email{" "}
          <a className="text-neon-lime hover:underline" href="mailto:privacy@deelrxcrm.com">
            privacy@deelrxcrm.com
          </a>{" "}
          with the subject &quot;Privacy Request&quot; and identify the DRX account involved.
          Organization-controlled business-record requests may be routed to the
          subscribing business.
        </p>
      </SectionBlock>

      <SectionBlock title="11. Regulated retail and children" className={sectionClassName}>
        <p>
          DRX provides business software; it is not a healthcare or pharmacy service.
          A subscribing business is responsible for lawful product sales, age
          verification, licensing, tax, consumer notices, and recordkeeping in every
          jurisdiction where it operates.
        </p>
        <p>
          DRX is not directed to children under 13 and is not intended for minors to
          independently purchase age-restricted products. If you believe a child has
          provided information improperly, contact us so we can investigate.
        </p>
      </SectionBlock>

      <SectionBlock title="12. International processing and policy changes" className={sectionClassName}>
        <p>
          Wrelik and its providers may process information in the United States and
          other countries. Where required, we use contractual or other safeguards for
          international transfers.
        </p>
        <p>
          We may update this policy to reflect changes in DRX, law, or our practices.
          We will post the revised policy and update the date above. We will provide
          additional notice or obtain consent before a materially different use when
          required by law.
        </p>
      </SectionBlock>

      <SectionBlock title="13. Contact" className={sectionClassName}>
        <p>
          Wrelik Brands LLC · Privacy inquiries:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:privacy@deelrxcrm.com">
            privacy@deelrxcrm.com
          </a>{" "}
          · Product support:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:support@deelrxcrm.com">
            support@deelrxcrm.com
          </a>
        </p>
      </SectionBlock>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="text-neon-lime hover:underline" href="/legal/terms">
          Read the Terms of Service
        </Link>
        <Link className="text-neon-lime hover:underline" href="/legal">
          Return to the legal hub
        </Link>
      </div>
    </PageFrame>
  );
}
