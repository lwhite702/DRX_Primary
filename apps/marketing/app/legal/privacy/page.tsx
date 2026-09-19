import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Privacy Policy | Deelrx CRM",
  description:
    "How Wrelik Brands LLC and Deelrx CRM collect, encrypt, protect, retain, and handle data across web and mobile applications.",
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
        Effective September 3, 2026 · Last updated September 18, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        This Privacy Policy applies to DRX, also presented as Deelrx CRM, including its public
        websites, cloud web applications, native iOS application (Apple App Store / TestFlight), and
        native Android application (Google Play).
      </p>

      <SectionBlock title="1. Scope and roles" className={sectionClassName}>
        <p>
          DRX is a privacy-first operating system designed for independent regulated retail businesses.
          This policy explains how Wrelik Brands LLC (&quot;Wrelik,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) collects, uses, encrypts, retains, and protects personal and business
          information when people visit our website or use DRX.
        </p>
        <p>
          A subscribing business generally acts as the data controller or primary business steward for
          the retail customer, inventory, sales transaction, and workforce records its authorized
          operators enter into DRX. Wrelik processes those operational records to deliver the service in
          accordance with tenant configuration and applicable law. Wrelik separately determines the means
          and purposes of processing information required for platform security, infrastructure
          integrity, billing, legal compliance, and customer support.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Information DRX processes" className={sectionClassName}>
        <p>Depending on the features an operator configures, DRX processes:</p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Account and operator credentials:</strong> names, business
            email addresses, secure authentication identifiers, assigned roles (Owner, Manager,
            Supervisor, Cashier, Staff), system permissions, and audit logs.
          </li>
          <li>
            <strong className="text-white">Business profile information:</strong> legal business name,
            store locations, time zones, functional currency, approved sales tax rates, and operational
            settings.
          </li>
          <li>
            <strong className="text-white">Retail customer profiles:</strong> aliases, names, phone
            numbers, optional contact email addresses, delivery addresses, customer notes, purchase
            histories, store credit balances, and age-verification indicators when a merchant chooses to
            record them.
          </li>
          <li>
            <strong className="text-white">Product and inventory records:</strong> SKU codes, barcodes,
            product titles, batch identifiers, unit costs, selling prices, stock quantities, receiving
            logs, count adjustment reasons, and category specifications.
          </li>
          <li>
            <strong className="text-white">Sales and register transactions:</strong> cart line items,
            quantities, discounts applied, taxes collected, tender types (cash, third-party card, store
            credit), delivery fee allocations, refund and void records, and daily cashier drawer counts.
            DRX is not configured to store full payment-card primary account numbers (PANs) or CVVs.
          </li>
          <li>
            <strong className="text-white">Device, network, and diagnostics:</strong> app build version,
            device model, operating system version, anonymized IP-derived network metadata, crash logs,
            and error traces. The Android and iOS apps do not access precise GPS background location.
          </li>
          <li>
            <strong className="text-white">Communications and SMS details:</strong>{" "}
            support requests, feedback, contact details (including mobile phone numbers),
            communication preferences, and text messaging consent records when you opt
            in to receive SMS or other communications.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="3. How information is used" className={sectionClassName}>
        <p>We use the information we collect and process to:</p>
        <ul className={listClassName}>
          <li>Provide, operate, synchronize, maintain, and improve DRX features across web and mobile platforms;</li>
          <li>Authenticate users, issue secure session tokens, and strictly enforce tenant isolation, business boundaries, and role permissions;</li>
          <li>Process inventory changes, sales transactions, store credit balances, deliveries, financial summaries, and merchant-directed workflows;</li>
          <li>Support encrypted offline register caching and reconcile approved offline sales batches upon network reconnection;</li>
          <li>
            Send requested transactional notifications, account security alerts, delivery updates, operational notices, and relevant communications (including text messages where express opt-in consent is obtained);
          </li>
          <li>Measure aggregate platform reliability, diagnose system defects, prevent fraud or unauthorized access, and protect the security of our infrastructure;</li>
          <li>Respond promptly to merchant customer support inquiries and data privacy requests;</li>
          <li>Comply with applicable legal mandates, tax compliance guidelines, court orders, and enforce our service agreements; and</li>
          <li>Execute automated data retention cleanup protocols according to merchant-configured policies.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="4. Mobile application disclosures (Apple App Store &amp; Google Play)" className={sectionClassName}>
        <p>
          Our native mobile applications adhere strictly to the Apple App Store Review Guidelines and
          Google Play Developer Program Policies:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Device permissions:</strong>
            <ul className="list-disc space-y-1 pl-5 mt-1 text-sm">
              <li>
                <strong className="text-white">Camera:</strong> Used solely when the operator taps the
                camera scan button to read a physical product barcode. Barcode scanning processes image
                data locally in memory; camera frames are never recorded, saved, or transmitted to
                external servers.
              </li>
              <li>
                <strong className="text-white">Push notifications:</strong> Used only with explicit user
                permission to send critical operational alerts, delivery handoff notices, and security
                warnings. Notification permissions can be toggled off anytime in operating system
                settings.
              </li>
              <li>
                <strong className="text-white">No precise GPS location:</strong> DRX does NOT request,
                collect, or monitor continuous or background GPS location.
              </li>
            </ul>
          </li>
          <li>
            <strong className="text-white">Financial services disclaimer (Google Play policy):</strong> DRX
            is an enterprise business operations platform and point-of-sale register system. DRX is NOT a
            personal loan provider, payday loan app, peer-to-peer money transmitter, or consumer credit
            broker. Customer store account ledgers represent internal merchant credit lines between a store
            and its patrons.
          </li>
          <li>
            <strong className="text-white">Account deletion capability (Apple Guideline 5.1.1(v)):</strong>{" "}
            Store owners and operators can request complete deletion of their account and associated personal
            data directly through the application settings or by emailing{" "}
            <a className="text-neon-lime hover:underline" href="mailto:privacy@deelrxcrm.com">
              privacy@deelrxcrm.com
            </a>
            . Deletion removes operator credentials, profile records, and active sessions within 30 days.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="5. SMS communication rules &amp; carrier compliance (A2P 10DLC)" className={sectionClassName}>
        <div className="rounded-xl border border-neon-lime/30 bg-neon-lime/5 p-4 text-white">
          <p className="font-semibold text-neon-lime text-base">
            Strict SMS Privacy Commitment — Zero Third-Party Sharing
          </p>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Wrelik Brands LLC (operating DRX, also presented as Deelrx CRM) is committed to protecting consumer and operator privacy. We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.
          </p>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Text messaging originator opt-in data and consent are strictly excluded from any sharing with third parties, affiliates, or external partners for marketing or promotional purposes. Any mobile phone numbers collected through our SMS consent forms, applications, or support workflows are used solely to deliver the relevant operational communications, account alerts, delivery updates, and customer support you specifically requested.
          </p>
        </div>
        <ul className={`${listClassName} mt-4`}>
          <li>
            <strong className="text-white">Consent and opt-in:</strong> We require verifiable express
            consent prior to sending SMS notifications. Consent is logged with timestamp, user identity, and
            opt-in medium.
          </li>
          <li>
            <strong className="text-white">Standard keywords:</strong> Recipients can reply{" "}
            <strong className="text-white">STOP</strong> to immediately cancel text communications, or{" "}
            <strong className="text-white">HELP</strong> for customer support instructions.
          </li>
          <li>
            <strong className="text-white">Rates and carriers:</strong> Message and data rates may apply.
            Message frequency varies based on store activity and notification preferences. Wireless
            carriers are not liable for delayed or undelivered messages.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="6. Encryption technology and security architecture" className={sectionClassName}>
        <p>
          Wrelik employs multi-layered administrative, technical, and cryptographic defenses to safeguard
          retail business data:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Encryption in transit:</strong> All network traffic between web
            browsers, iOS devices, Android devices, and DRX cloud infrastructure is enforced over TLS 1.3
            using strong cipher suites with forward secrecy. HTTP connections automatically redirect to
            HTTPS.
          </li>
          <li>
            <strong className="text-white">Encryption at rest:</strong> All databases, cloud data volumes,
            and system backups are encrypted at rest using AES-256 encryption.
          </li>
          <li>
            <strong className="text-white">Field-level encryption:</strong> Sensitive data attributes—such as
            customer contact details, delivery drop-off addresses, and authentication tokens—receive
            field-level cryptographic protection before writing to persistent database storage.
          </li>
          <li>
            <strong className="text-white">Multi-tenant isolation:</strong> DRX enforces server-side tenant
            scoping at the database query and mutation layer. Every data operation verifies the
            authenticated user&apos;s active business membership and assigned role. Cross-tenant queries are
            architecturally barred.
          </li>
          <li>
            <strong className="text-white">Protected mobile &amp; offline storage:</strong> On mobile
            devices, session credentials reside in secure platform keychains (iOS Keychain and Android
            EncryptedSharedPreferences). Approved offline register caching utilizes an encrypted
            SQLCipher database.
          </li>
          <li>
            <strong className="text-white">In-store screen privacy:</strong> Cashier registers feature an
            optional Screen Privacy mode that masks customer account balances and phone numbers to prevent
            shoulder surfing by in-store shoppers.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="7. Data retention cleanup and permanent deletion" className={sectionClassName}>
        <p>
          DRX provides an automated Privacy Protocol engine designed to prevent the indefinite accumulation
          of customer records:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Alias Mode:</strong> Collects minimal customer aliases. Inactive
            records qualify for permanent deletion after a default of <strong className="text-white">30 days</strong> of inactivity.
          </li>
          <li>
            <strong className="text-white">Standard Mode:</strong> Allows optional customer contact details.
            Inactive records qualify for permanent deletion after a default of <strong className="text-white">180 days</strong>.
          </li>
          <li>
            <strong className="text-white">Full Customer Mode:</strong> Retains comprehensive customer
            records. Inactive records qualify for permanent deletion after a default of <strong className="text-white">365 days</strong>.
          </li>
        </ul>
        <p className="mt-3">
          When retention cleanup executes, qualifying records are <strong className="text-white">permanently hard-deleted</strong> from
          active production tables. Cleanup automatically skips customer records with an active positive
          credit balance or an unresolved operational dispute. Encrypted rotation backups cycle out
          according to scheduled disaster-recovery lifecycles.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Law enforcement obligations &amp; information we cannot share" className={sectionClassName}>
        <p>
          Wrelik Brands LLC respects constitutional and statutory privacy rights while complying with lawful
          government process:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Legal process standard:</strong> We disclose business or customer
            records to government agencies or law enforcement only upon receipt of valid, legally binding
            legal process—such as a search warrant, court order signed by a judge, or formal grand jury
            subpoena issued by a court of competent jurisdiction. We scrutinize every request for statutory
            validity, jurisdiction, and overbreadth, and challenge unlawful or overreaching demands.
          </li>
          <li>
            <strong className="text-white">Notice to affected businesses:</strong> Unless strictly prohibited
            by a court-ordered gag order, statutory non-disclosure requirement, or verified emergency
            involving imminent death or physical harm, our policy is to provide prompt written notice to the
            affected business owner before disclosing records, allowing them an opportunity to seek
            protective judicial relief.
          </li>
          <li>
            <strong className="text-white">Zero-knowledge and data we DO NOT have access to share:</strong>
            <ul className="list-disc space-y-1 pl-5 mt-1 text-sm">
              <li>
                <strong className="text-white">No payment card numbers:</strong> DRX does not store credit
                card numbers, CVVs, or magnetic stripe data. We cannot produce payment card details because
                we do not possess them.
              </li>
              <li>
                <strong className="text-white">No plain-text passwords:</strong> User passwords are salted
                and hashed using strong cryptographic hashing algorithms. We have no access to plain-text
                passwords.
              </li>
              <li>
                <strong className="text-white">No uncollected customer data:</strong> In Alias Mode,
                merchants record only an alias (such as &quot;Customer 104&quot;). Wrelik cannot produce
                legal names, government IDs, or phone numbers that were never entered.
              </li>
              <li>
                <strong className="text-white">No deleted records:</strong> Once records are purged via
                retention cleanup or merchant deletion, they are hard-deleted from production storage. We
                cannot reconstruct or produce permanently destroyed records.
              </li>
              <li>
                <strong className="text-white">No banking deposits:</strong> We are not a bank and do not
                hold merchant funds, escrow accounts, or consumer deposits.
              </li>
            </ul>
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="9. Data security best practices for retail operators" className={sectionClassName}>
        <p>
          Security is a shared responsibility between Wrelik and your retail crew. We strongly advise store
          owners to enforce these operational security best practices:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Enforce individual operator logins:</strong> Never share an owner
            password or master manager PIN. Give each cashier and supervisor their own account so audit
            trails remain distinct and accountable.
          </li>
          <li>
            <strong className="text-white">Apply least-privilege roles:</strong> Assign cashiers only POS
            register permissions. Restrict financial reports, inventory cost editing, and customer deletion
            to trusted managers and owners.
          </li>
          <li>
            <strong className="text-white">Enable Screen Privacy:</strong> Turn on Screen Privacy in
            Settings during retail shifts so shoppers standing at the counter cannot view customer balances
            or phone numbers.
          </li>
          <li>
            <strong className="text-white">Lock counter devices:</strong> Configure iPads, tablets, and POS
            terminals to auto-lock after brief inactivity, and train staff to lock registers when stepping
            away.
          </li>
          <li>
            <strong className="text-white">Conduct daily offline exports:</strong> Export reconciliation
            CSVs from Reports at the close of every business day and store them in secure, encrypted, offline
            storage.
          </li>
          <li>
            <strong className="text-white">Immediate staff offboarding:</strong> When an employee departs,
            immediately remove their account in Manage Team to revoke access across all devices instantly.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="10. Individual privacy rights (CCPA/CPRA &amp; State Laws)" className={sectionClassName}>
        <p>
          Depending on your jurisdiction (including California, Colorado, Connecticut, Virginia, Utah, and
          other states), you may have statutory rights regarding your personal information:
        </p>
        <ul className={listClassName}>
          <li>The right to know what personal information is collected, used, and disclosed;</li>
          <li>The right to request deletion of personal information;</li>
          <li>The right to correct inaccurate personal information;</li>
          <li>The right to non-discrimination for exercising privacy rights; and</li>
          <li>
            The right to opt out of the sale or sharing of personal information (note: Wrelik does NOT sell
            or share personal data for cross-context behavioral advertising).
          </li>
        </ul>
        <p className="mt-3">
          To exercise privacy rights regarding a Wrelik-administered account, submit a request to{" "}
          <a className="text-neon-lime hover:underline" href="mailto:privacy@deelrxcrm.com">
            privacy@deelrxcrm.com
          </a>
          . For retail customer records held by a subscribing store, retail patrons should submit requests
          directly to the store where they made purchases.
        </p>
      </SectionBlock>

      <SectionBlock title="11. Contact information" className={sectionClassName}>
        <address className="not-italic text-sm text-text-secondary">
          <strong className="text-white">Wrelik Brands LLC</strong><br />
          Attn: Privacy &amp; Data Protection Officer<br />
          1700 Northside Drive<br />
          Atlanta, GA 30318, United States<br />
          Privacy Inquiries:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:privacy@deelrxcrm.com">
            privacy@deelrxcrm.com
          </a>{" "}
          · Customer Support:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:support@deelrxcrm.com">
            support@deelrxcrm.com
          </a>
        </address>
      </SectionBlock>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="text-neon-lime hover:underline" href="/legal/terms">
          Terms of Service
        </Link>
        <Link className="text-neon-lime hover:underline" href="/legal/lawful-use">
          Lawful Commercial Use Policy
        </Link>
        <Link className="text-neon-lime hover:underline" href="/legal/regulatory-disclaimer">
          Regulatory Disclaimer
        </Link>
        <Link className="text-neon-lime hover:underline" href="/beta">
          Beta Software Agreement
        </Link>
        <Link className="text-neon-lime hover:underline" href="/legal">
          Return to Legal Hub
        </Link>
      </div>
    </PageFrame>
  );
}
