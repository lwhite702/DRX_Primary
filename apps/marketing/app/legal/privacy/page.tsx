import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Privacy Policy | Deelrx CRM",
  description:
    "How Wrelik Brands LLC and Deelrx CRM collect, use, disclose, retain, and protect personal information.",
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
        Effective August 2, 2026 · Last updated August 2, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        This Privacy Policy includes the DRX / Deelrx CRM Privacy Addendum below. The addendum
        forms part of this Policy and controls if it conflicts with a general section.
      </p>

      <SectionBlock title="1. Scope" className={sectionClassName}>
        <p>
          This Privacy Policy explains how Wrelik Brands LLC (&quot;Wrelik,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) collects, uses, discloses, and protects Personal
          Information when you visit our websites or use our applications and related services,
          including Sporkd, Klutr, and DRX / Deelrx CRM (each an &quot;App&quot; and together, the
          &quot;Services&quot;). &quot;Personal Information&quot; means information that identifies,
          relates to, describes, or can reasonably be linked with an individual.
        </p>
        <p>
          The app-specific addendum presented with this Privacy Policy describes practices unique
          to the App you use. If an app-specific addendum conflicts with the general portions of
          this Privacy Policy, the addendum controls for that App.
        </p>
        <p>
          For individual accounts and our websites, Wrelik generally determines why and how
          Personal Information is processed. For DRX business accounts, the subscribing business
          generally controls the business records and Personal Information entered by its
          authorized users. In that context, Wrelik processes the information on the business
          customer&apos;s instructions as its service provider or processor, except for account
          administration, security, billing, compliance, and other purposes for which Wrelik
          independently determines the means and purposes of processing.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Information we collect" className={sectionClassName}>
        <p>Depending on the Service and the features you use, we may collect:</p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Account and identity information:</strong> name, email
            address, profile details, authentication identifiers, organization membership, role,
            account settings, and login or security events.
          </li>
          <li>
            <strong className="text-white">Content and workflow information:</strong> text, notes,
            links, files, images, audio, transcriptions, recipes, lists, business records, customer
            records, inventory records, sales records, and other information you choose to create,
            import, upload, or process through a Service.
          </li>
          <li>
            <strong className="text-white">Transaction and subscription information:</strong> plan,
            subscription status, purchase history, billing contact, and limited payment-related
            records. Payment card information is handled by the applicable payment processor or app
            marketplace and is not stored in full by Wrelik.
          </li>
          <li>
            <strong className="text-white">Device, network, and usage information:</strong> IP
            address, browser or device type, operating system, app version, language, pages or
            features used, timestamps, referring pages, session and interaction information, and
            similar technical information.
          </li>
          <li>
            <strong className="text-white">Diagnostics and security information:</strong> crash
            reports, error logs, performance data, audit events, suspected fraud or abuse signals,
            and information needed to keep accounts and Services secure.
          </li>
          <li>
            <strong className="text-white">Communications:</strong> support requests, feedback,
            survey responses, beta-program communications, and other messages you send to us.
          </li>
          <li>
            <strong className="text-white">Information from integrations and third parties:</strong>{" "}
            information received when you use a sign-in provider, app marketplace, connected
            service, content source, or an integration you or your organization enables.
          </li>
        </ul>
        <p>
          We collect information directly from you, automatically from the device or browser you
          use, from the organization that provides your account, and from third parties you choose
          to connect with a Service.
        </p>
      </SectionBlock>

      <SectionBlock title="3. How we use information" className={sectionClassName}>
        <p>We use Personal Information to:</p>
        <ul className={listClassName}>
          <li>provide, operate, maintain, sync, and support the Services;</li>
          <li>authenticate users, administer accounts and organizations, and enforce role-based access;</li>
          <li>process user-directed content and requests, including optional AI-assisted features;</li>
          <li>personalize settings and restore user or business data across supported devices;</li>
          <li>provide subscriptions, billing administration, transactional messages, and customer support;</li>
          <li>monitor reliability, measure feature use, diagnose errors, and improve usability and performance;</li>
          <li>protect users, organizations, Wrelik, and the public from fraud, abuse, security threats, and unlawful activity;</li>
          <li>comply with law, enforce our agreements, resolve disputes, and protect legal rights; and</li>
          <li>communicate about material Service, security, policy, or account changes.</li>
        </ul>
        <p>
          Where applicable law requires a legal basis, we rely on performance of a contract,
          legitimate interests such as security and service improvement, compliance with legal
          obligations, and consent where requested. You may withdraw consent for future processing
          when consent is the applicable basis.
        </p>
      </SectionBlock>

      <SectionBlock title="4. AI-assisted processing" className={sectionClassName}>
        <p>
          Some Services offer optional features that use machine learning or generative AI. When you
          direct an AI feature to process content, the relevant input, instructions, and necessary
          context may be sent to Wrelik&apos;s configured AI infrastructure and model providers to
          return the requested result. We limit this processing to providing, securing, and
          improving the feature as described in the applicable addendum and provider terms.
        </p>
        <p>
          AI output may be incomplete, inaccurate, or inappropriate. Do not rely on AI output as
          professional, medical, legal, financial, tax, safety, or regulatory advice. Do not submit
          information to an AI feature unless you are authorized to use and disclose it for that
          purpose.
        </p>
        <p>
          Wrelik does not use customer content to build advertising profiles or sell it. Any
          materially different use of customer content for model training would require updated
          notice and, where required, consent.
        </p>
      </SectionBlock>

      <SectionBlock title="5. How we disclose information" className={sectionClassName}>
        <p>We may disclose Personal Information:</p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">To service providers and processors</strong> that provide
            cloud hosting, databases, storage, authentication, analytics, error monitoring,
            communications, customer support, app distribution, payment processing, content
            processing, and AI infrastructure. Depending on the App and feature, these providers
            may include Apple, Google, Expo, Vercel, Convex, Neon, Supabase, Clerk or another
            configured authentication provider, PostHog, Sentry, Resend, and configured AI model
            providers.
          </li>
          <li>
            <strong className="text-white">At your or your organization&apos;s direction,</strong>{" "}
            including to integrations, content sources, collaborators, or other users with
            authorized access.
          </li>
          <li>
            <strong className="text-white">For legal and safety reasons</strong> when reasonably
            necessary to comply with law or valid legal process; protect rights, safety, and
            security; investigate fraud or abuse; or enforce our agreements.
          </li>
          <li>
            <strong className="text-white">In a business transaction</strong> such as a financing,
            merger, acquisition, reorganization, bankruptcy, or sale of assets, subject to
            appropriate confidentiality and notice where required.
          </li>
          <li>
            <strong className="text-white">With professional advisers and affiliates</strong> that
            need the information to provide legal, accounting, insurance, security, or operational
            support and are required to protect it.
          </li>
        </ul>
        <p>
          We do not sell Personal Information for money. We do not use or disclose Personal
          Information for cross-context behavioral advertising. We have not sold Personal
          Information or shared it for cross-context behavioral advertising during the preceding 12
          months. If these practices change, we will update this Policy and provide legally required
          choices before the change applies.
        </p>
        <p>
          Service providers may process information only to perform services for us or as otherwise
          permitted by their agreements and applicable law. We require providers that receive user
          data to apply protections appropriate to the information and their role.
        </p>
      </SectionBlock>

      <SectionBlock title="6. Cookies, local storage, analytics, and preferences" className={sectionClassName}>
        <p>
          Our websites and web applications may use cookies, local storage, and similar technologies
          for authentication, security, preferences, feature operation, analytics, and performance.
          Required technologies are used to deliver the Service. Where required, we request consent
          before enabling optional analytics or similar technologies. Browser settings can limit
          some technologies, but doing so may prevent parts of a Service from working.
        </p>
        <p>
          We honor legally required opt-out signals where they apply to our practices. Because we do
          not currently sell Personal Information or use it for cross-context behavioral
          advertising, there is no sale or targeted-advertising activity to opt out of.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Retention and deletion" className={sectionClassName}>
        <p>
          We retain Personal Information only as long as reasonably necessary for the purposes
          described in this Policy, including while an account or customer relationship is active;
          to provide user-requested retention, synchronization, or recovery; to meet contractual,
          tax, accounting, audit, and legal obligations; to resolve disputes; and to protect the
          Services.
        </p>
        <p>
          When an account, workspace, or item is deleted, we remove or de-identify the information
          from active systems after verifying the request and completing the deletion workflow,
          unless retention is required or permitted by law or needed to protect the rights and
          security of users or the Service. Limited copies may remain temporarily in encrypted
          backups, logs, fraud-prevention records, or records subject to legal holds until those
          records are rotated or no longer required. De-identified information that cannot
          reasonably identify an individual may be retained for analytics, security, and Service
          improvement.
        </p>
        <p>
          For an organization-managed DRX account, the organization controls ordinary retention,
          export, correction, and deletion requests for business data. Individuals should first
          contact that organization; Wrelik will assist the organization as required by contract and
          law.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Security" className={sectionClassName}>
        <p>
          We use administrative, technical, and organizational measures designed to protect
          Personal Information, including access controls, authentication safeguards, encrypted
          network transport, service-provider controls, logging, and environment separation where
          appropriate. No system is completely secure, and we cannot guarantee that unauthorized
          access, loss, or misuse will never occur. You are responsible for using unique credentials,
          protecting your devices, and promptly reporting suspected unauthorized access.
        </p>
      </SectionBlock>

      <SectionBlock title="9. Your privacy rights and choices" className={sectionClassName}>
        <p>Depending on where you live and how Wrelik processes your information, you may have the right to:</p>
        <ul className={listClassName}>
          <li>know or access the Personal Information we hold about you;</li>
          <li>correct inaccurate Personal Information;</li>
          <li>request deletion;</li>
          <li>receive a portable copy of information you provided;</li>
          <li>restrict or object to certain processing;</li>
          <li>withdraw consent for future processing;</li>
          <li>opt out of sale, targeted advertising, or qualifying profiling where applicable; and</li>
          <li>appeal a denied privacy request or complain to a data protection authority.</li>
        </ul>
        <p>
          We will not discriminate against you for exercising a privacy right. To submit a request,
          email <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">legal@wrelik.com</a>{" "}
          with the subject &quot;Privacy Request&quot; and identify the App and account involved. We may
          need to verify your identity and authority before completing a request. An authorized agent
          may submit a request where permitted by law, subject to verification.
        </p>
        <p>
          If an organization controls your DRX account, send business-data requests to that
          organization. You may also contact us, and we will route or assist with the request as
          appropriate.
        </p>
      </SectionBlock>

      <SectionBlock title="10. U.S. state disclosures" className={sectionClassName}>
        <p>
          During the preceding 12 months, we may have collected the categories described in Section
          2: identifiers; customer-record information; commercial or subscription information;
          internet or electronic-network activity; approximate geolocation derived from IP address;
          audio, visual, or other content you submit; professional or employment-related information
          for business accounts; and inferences limited to providing or improving requested
          features. We collect these categories from the sources described in Section 2, use them
          for the purposes in Section 3, and disclose them to the categories of recipients in
          Section 5.
        </p>
        <p>
          We do not use sensitive Personal Information to infer characteristics about individuals.
          We do not knowingly sell or share the Personal Information of people under 16. Rights
          provided by California, Colorado, Connecticut, Virginia, and other state laws apply only
          when the relevant law covers Wrelik&apos;s processing and the request.
        </p>
      </SectionBlock>

      <SectionBlock title="11. International data transfers" className={sectionClassName}>
        <p>
          Wrelik is based in the United States, and our providers may process information in the
          United States and other countries. Those locations may have data-protection laws different
          from those where you live. Where required, we use contractual and other safeguards intended
          to provide an appropriate level of protection for international transfers.
        </p>
      </SectionBlock>

      <SectionBlock title="12. Children" className={sectionClassName}>
        <p>
          The Services are not directed to children under 13, and we do not knowingly collect
          Personal Information from a child under 13. If you believe a child has provided Personal
          Information in violation of this section, contact{" "}
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">legal@wrelik.com</a>{" "}
          so we can investigate and take appropriate action. A Service or customer organization may
          impose a higher minimum age.
        </p>
      </SectionBlock>

      <SectionBlock title="13. Third-party services and content" className={sectionClassName}>
        <p>
          The Services may link to or interact with third-party websites, content, authentication
          providers, app marketplaces, or integrations. Their privacy practices are governed by
          their own notices. Wrelik does not control independent third parties and is not responsible
          for their practices.
        </p>
      </SectionBlock>

      <SectionBlock title="14. Changes to this Policy" className={sectionClassName}>
        <p>
          We may update this Policy to reflect changes in the Services, law, or our practices. We
          will post the updated version and revise the &quot;Last updated&quot; date. If a change
          materially expands how previously collected Personal Information is used, we will provide
          additional notice and obtain consent where required.
        </p>
      </SectionBlock>

      <SectionBlock title="15. Contact" className={sectionClassName}>
        <p>Questions and privacy requests may be sent to:</p>
        <address className="not-italic">
          <strong className="text-white">Wrelik Brands LLC</strong><br />
          Attn: Privacy<br />
          1700 Northside Drive<br />
          Atlanta, GA 30318, United States<br />
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">legal@wrelik.com</a>
        </address>
      </SectionBlock>

      <section className="mt-10 border-t border-white/15 pt-10" aria-labelledby="drx-privacy-addendum">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">App-specific addendum</p>
        <h2 id="drx-privacy-addendum" className="mt-3 text-3xl font-bold text-white">
          Privacy Addendum — DRX / Deelrx CRM
        </h2>
        <p className="mt-4 text-text-secondary">This addendum applies when you use DRX, also presented as Deelrx CRM.</p>
      </section>

      <SectionBlock title="1. Business-controlled data" className={sectionClassName}>
        <p>
          DRX is a business operations platform. The subscribing business controls the records its
          authorized users enter, import, or create and is responsible for providing required
          notices, establishing a lawful basis, responding to individuals, and configuring access.
          Wrelik processes that data to provide DRX and acts as a service provider or processor where
          applicable. Wrelik acts independently for account administration, security, billing,
          compliance, support, and protection of the Service.
        </p>
      </SectionBlock>

      <SectionBlock title="2. DRX data categories" className={sectionClassName}>
        <p>Depending on the features a business uses, DRX may process:</p>
        <ul className={listClassName}>
          <li>business identity, owner, location, contact, and subscription details;</li>
          <li>manager, employee, and authorized-user profiles, authentication identifiers, roles, permissions, and account activity;</li>
          <li>customer names, aliases, contact details, addresses, account notes, loyalty, purchase history, balances, payments, and credit records;</li>
          <li>inventory, product, SKU, barcode, vendor, batch, quantity, cost, price, intake, and adjustment records;</li>
          <li>sales, returns, discounts, taxes, tender type, payment reference, delivery, reconciliation, and line-item records;</li>
          <li>audit logs, reports, support content, and records submitted through enabled integrations.</li>
        </ul>
        <p>
          Businesses should not enter full payment-card data, Social Security numbers, protected
          health information, or other data DRX is not expressly designed to process.
        </p>
      </SectionBlock>

      <SectionBlock title="3. Payment and regulated sales" className={sectionClassName}>
        <p>
          If a business enables a third-party payment processor, that provider processes payment
          credentials under its own terms. DRX may retain transaction status, amount, tender type,
          and processor reference needed for reconciliation. The business remains responsible for
          age verification, product restrictions, tax, consumer notices, recordkeeping, and other
          retail obligations.
        </p>
      </SectionBlock>

      <SectionBlock title="4. Organization access and privacy requests" className={sectionClassName}>
        <p>
          Business owners and administrators can invite users, assign roles, review activity, export
          available records and reports, and direct correction or deletion through available DRX
          features. DRX does not currently provide a universal self-service export or deletion tool
          for every type of business record. Authorized users and retail customers should send
          ordinary business-record requests to the subscribing business. Wrelik may access business
          data when necessary for support, security, incident response, legal compliance, or
          customer-authorized operations.
        </p>
      </SectionBlock>

      <SectionBlock title="5. Analytics and diagnostics" className={sectionClassName}>
        <p>
          DRX uses PostHog for product analytics and Sentry for error and performance monitoring.
          Depending on platform and configuration, these services can receive an authorized
          user&apos;s identifier, email, name, organization, role, IP-derived network information,
          device or browser information, pages and features used, interaction autocapture,
          diagnostic context, and masked session replay. We configure these services to avoid
          intentionally capturing retail-customer names, contact details, sale line items, payment
          references, or free-form business records as analytics event properties or replay content,
          but diagnostic context may contain information associated with an identified authorized
          user.
        </p>
      </SectionBlock>

      <SectionBlock title="6. AI-assisted operations" className={sectionClassName}>
        <p>
          If an organization uses an AI feature, selected operational data and instructions may be
          processed through configured AI infrastructure and model providers to produce the requested
          output. This can include derived inventory and product metrics for inventory-health analysis
          and customer purchase, balance, payment-timing, tenure, and business metrics for advisory
          credit recommendations. The business is responsible for authorizing that use and reviewing
          output before acting on it. DRX does not make legally binding employment, credit,
          eligibility, or compliance decisions on a business&apos;s behalf, and AI output must not be
          the sole basis for a decision that significantly affects a person.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Retention, deletion, and account closure" className={sectionClassName}>
        <p>
          Business data is retained according to the customer relationship, organization
          instructions, configured product functionality, and legal obligations. Customer-retention
          profiles can use windows including 7, 30, 180, or 365 days. A scheduled cleanup can be
          deferred when an active credit balance, legal hold, audit requirement, security need, or
          other permitted retention obligation applies. User-account closure may delete an identity,
          or mask or archive local profile information, while transaction, audit, tax, dispute, and
          security records remain where required or permitted.
        </p>
        <p>
          Before closing an account, the organization should export the records available through
          DRX that it must retain. Wrelik may retain limited records needed for security, audit,
          dispute resolution, tax, and legal compliance after closure. Backups and logs may retain
          limited copies until they rotate.
        </p>
      </SectionBlock>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="text-neon-lime hover:underline" href="/legal/terms">Read the Terms of Use</Link>
        <Link className="text-neon-lime hover:underline" href="/legal">Return to the legal hub</Link>
      </div>
    </PageFrame>
  );
}
