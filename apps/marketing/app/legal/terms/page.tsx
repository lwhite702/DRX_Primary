import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Terms of Use | Deelrx CRM",
  description: "Terms governing access to Wrelik services and DRX / Deelrx CRM.",
  alternates: { canonical: "/legal/terms" },
};

const sectionClassName = "mt-6";
const listClassName = "list-disc space-y-2 pl-5";

export default function LegalTermsPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/terms" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">Terms of Use</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Effective August 2, 2026 · Last updated August 4, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        These Terms include the DRX / Deelrx CRM Terms Addendum below. The addendum forms part of
        these Terms and controls if it conflicts with a general section.
      </p>

      <SectionBlock title="1. Agreement and scope" className={sectionClassName}>
        <p>
          These Terms of Use (&quot;Terms&quot;) are a binding agreement between you and Wrelik
          Brands LLC (&quot;Wrelik,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          governing your access to and use of our websites, applications, and related services,
          including Sporkd, Klutr, and DRX / Deelrx CRM (the &quot;Services&quot;). By creating an
          account, downloading an App, clicking to accept, or using a Service, you agree to these
          Terms and the Privacy Policy.
        </p>
        <p>
          The app-specific terms addendum presented with these Terms forms part of the agreement and
          controls if it conflicts with the general Terms. A signed order form, subscription
          agreement, data processing agreement, or other written agreement between Wrelik and a
          business customer controls to the extent it expressly conflicts with these Terms.
        </p>
        <p>If you do not agree, do not use the Services.</p>
      </SectionBlock>

      <SectionBlock title="2. Eligibility and authority" className={sectionClassName}>
        <p>
          You must be at least 13 years old to use a consumer Service and must meet any higher
          minimum age required by the applicable App, organization, or law. If you have not reached
          the age of majority where you live, you may use a consumer Service only with permission
          from a parent or legal guardian who agrees to these Terms.
        </p>
        <p>
          You must be at least 18 and authorized to bind the organization to accept these Terms on
          its behalf. If you use an organization-provided account, that organization may control the
          account, content, retention, and access, and its instructions may take priority over your
          individual preferences.
        </p>
      </SectionBlock>

      <SectionBlock title="3. Accounts and security" className={sectionClassName}>
        <p>
          Provide accurate information, keep it current, protect your credentials and devices, and
          notify us promptly of suspected unauthorized access. You are responsible for activity
          performed through your account to the extent permitted by law. You may not share
          credentials in a way that defeats user limits or security controls, impersonate another
          person, or access an account without authorization.
        </p>
        <p>
          Organization administrators are responsible for inviting authorized users, assigning
          appropriate roles, removing access promptly, and maintaining lawful instructions for
          business data.
        </p>
      </SectionBlock>

      <SectionBlock title="4. License and restrictions" className={sectionClassName}>
        <p>
          Subject to these Terms, Wrelik grants you a limited, personal or internal-business,
          non-exclusive, non-transferable, revocable license to access and use the Services for their
          intended purpose during the applicable subscription or authorized beta period.
        </p>
        <p>You may not:</p>
        <ul className={listClassName}>
          <li>copy, rent, lease, sell, sublicense, distribute, or commercially exploit a Service except as expressly permitted in writing;</li>
          <li>reverse engineer, decompile, bypass, probe, or defeat security or access controls, except where a restriction is prohibited by law;</li>
          <li>use automated means to scrape or extract data from a Service without written permission;</li>
          <li>interfere with the Service, introduce malicious code, overload infrastructure, or attempt unauthorized access;</li>
          <li>use the Service to violate law, infringe rights, harass, defraud, discriminate, or create or distribute unlawful or harmful content;</li>
          <li>use Service output or access to build or train a competing product or model except with written permission; or</li>
          <li>remove proprietary notices or misrepresent Wrelik&apos;s ownership, endorsement, or affiliation.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="5. Your content and data" className={sectionClassName}>
        <p>
          You retain ownership of content and data you submit to a Service (&quot;Your Content&quot;).
          You grant Wrelik and its service providers a worldwide, non-exclusive, royalty-free license
          to host, copy, transmit, process, display, and modify Your Content only as needed to
          provide, secure, support, and improve the Services; comply with your instructions; and meet
          legal obligations.
        </p>
        <p>
          You represent that you have all rights, permissions, notices, and lawful bases needed for
          Wrelik to process Your Content as described. Do not submit content that is unlawful,
          infringes intellectual property or privacy rights, violates a duty of confidentiality, or
          contains malicious code.
        </p>
        <p>
          We may remove or restrict content when reasonably necessary to address law, security,
          infringement, harm, or a violation of these Terms. You are responsible for maintaining any
          independent backup or export required for your purposes, subject to the App&apos;s
          available features.
        </p>
      </SectionBlock>

      <SectionBlock title="6. AI-assisted features" className={sectionClassName}>
        <p>
          An App may offer optional AI-assisted features. You direct what content is submitted and
          are responsible for reviewing the result. AI output is probabilistic and may be inaccurate,
          incomplete, offensive, or unsuitable. It is not professional advice and must not be the
          sole basis for medical, legal, financial, tax, safety, employment, credit, eligibility, or
          regulated-business decisions.
        </p>
        <p>
          To the extent permitted by law, Wrelik does not claim ownership of output generated for
          you. Similar output may be generated for others, and output may not be unique or
          protectable. You may not use AI features to violate rights, evade safeguards, generate
          unlawful content, or make prohibited high-impact decisions.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Third-party services and content" className={sectionClassName}>
        <p>
          The Services may depend on or link to third-party platforms, websites, content,
          integrations, authentication providers, app marketplaces, payment processors, or AI
          providers. Their services are governed by their own terms and may change or become
          unavailable. Wrelik is not responsible for independent third-party content or services,
          but this does not limit obligations that cannot be excluded by law.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Subscriptions, purchases, and taxes" className={sectionClassName}>
        <p>
          Prices, plan limits, renewal terms, and trial details are shown at purchase or in an
          applicable order form. Unless stated otherwise, subscriptions renew automatically for the
          same period until canceled. You authorize the applicable processor to charge the payment
          method on file. Fees are non-refundable except as required by law or the terms shown at
          purchase. You are responsible for applicable taxes other than taxes on Wrelik&apos;s income.
        </p>
        <p>
          If you purchase through Apple, Google, or another app marketplace, that marketplace
          processes the purchase and its billing, cancellation, and refund rules apply. Cancel
          through the marketplace or account settings identified at purchase. Deleting an App does
          not necessarily cancel a subscription.
        </p>
      </SectionBlock>

      <SectionBlock title="9. Beta and changing Services" className={sectionClassName}>
        <p>
          Features identified as beta, preview, experimental, or early access may be incomplete,
          change materially, contain errors, or be discontinued. Do not rely on beta features for
          critical records or regulated decisions. We may add, change, suspend, or discontinue
          features. When reasonably practicable, we will provide notice before a change that
          materially reduces a paid Service.
        </p>
      </SectionBlock>

      <SectionBlock title="10. Intellectual property and feedback" className={sectionClassName}>
        <p>
          Wrelik and its licensors own the Services, software, designs, brands, documentation, and
          all related intellectual property other than Your Content. No rights are granted except
          the limited license in these Terms.
        </p>
        <p>
          If you provide feedback, you grant Wrelik a perpetual, irrevocable, worldwide, royalty-free
          right to use it without restriction or compensation, provided we do not publicly identify
          you as the source without permission.
        </p>
      </SectionBlock>

      <SectionBlock title="11. Suspension and termination" className={sectionClassName}>
        <p>
          You may stop using a Service at any time and may request account closure through available
          account controls or by contacting support. Wrelik may suspend or terminate access if you
          materially breach these Terms, create a security or legal risk, fail to pay amounts due,
          or if continued operation is no longer commercially reasonable. When appropriate, we will
          provide notice and an opportunity to cure.
        </p>
        <p>
          Upon termination, the license ends. Provisions that by their nature should survive will
          survive, including ownership, payment obligations, disclaimers, liability limits, dispute
          terms, and rights relating to previously processed content. Data handling after termination
          is described in the Privacy Policy and any applicable business agreement.
        </p>
      </SectionBlock>

      <SectionBlock title="12. Disclaimers" className={sectionClassName}>
        <p className="font-semibold text-white">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND
          &quot;AS AVAILABLE.&quot; WRELIK DISCLAIMS IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES
          WILL BE UNINTERRUPTED, ERROR-FREE, COMPLETELY SECURE, OR THAT CONTENT OR OUTPUT WILL BE
          ACCURATE OR MEET YOUR REQUIREMENTS.
        </p>
        <p>Nothing in these Terms excludes a warranty, guarantee, or right that cannot lawfully be excluded.</p>
      </SectionBlock>

      <SectionBlock title="13. Limitation of liability" className={sectionClassName}>
        <p className="font-semibold text-white">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WRELIK AND ITS AFFILIATES, OFFICERS, EMPLOYEES,
          AGENTS, LICENSORS, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
          SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES, OR FOR LOST PROFITS, REVENUE,
          GOODWILL, BUSINESS OPPORTUNITY, OR DATA, ARISING FROM OR RELATED TO THE SERVICES.
        </p>
        <p className="font-semibold text-white">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE TOTAL LIABILITY OF WRELIK AND THOSE PARTIES FOR
          ALL CLAIMS ARISING FROM OR RELATED TO A SERVICE WILL NOT EXCEED THE GREATER OF (A) THE
          AMOUNT YOU PAID WRELIK FOR THAT SERVICE DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO
          THE CLAIM OR (B) US $100.
        </p>
        <p>
          These limitations apply regardless of the legal theory and even if a remedy fails of its
          essential purpose. They do not apply to liability that cannot be limited by law.
        </p>
      </SectionBlock>

      <SectionBlock title="14. Indemnity" className={sectionClassName}>
        <p>
          If you use a Service on behalf of a business or for commercial purposes, that business
          will defend, indemnify, and hold harmless Wrelik and its affiliates, officers, employees,
          and agents from third-party claims, damages, losses, and reasonable costs arising from Your
          Content, the business&apos;s violation of law or these Terms, or its users&apos;
          unauthorized or unlawful use of the Service. This section does not apply to individual
          consumers to the extent prohibited by law.
        </p>
      </SectionBlock>

      <SectionBlock title="15. Governing law and disputes" className={sectionClassName}>
        <p>
          These Terms are governed by the laws of the State of Georgia, without regard to
          conflict-of-law rules. Unless applicable law requires otherwise, state and federal courts
          located in Fulton County, Georgia will have exclusive jurisdiction over disputes arising
          from or relating to these Terms, and each party consents to that jurisdiction and venue.
        </p>
        <p>
          Before filing a claim, contact{" "}
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">legal@wrelik.com</a>{" "}
          and describe the dispute. The parties will attempt in good faith to resolve it informally
          for 30 days. This section does not prevent either party from seeking emergency injunctive
          relief or using an eligible small-claims court.
        </p>
        <p>
          Consumer protection laws in your home jurisdiction may provide mandatory rights or venues
          that these Terms cannot change.
        </p>
      </SectionBlock>

      <SectionBlock title="16. Apple App Store terms" className={sectionClassName}>
        <p>If you obtained an App through Apple&apos;s App Store:</p>
        <ul className={listClassName}>
          <li>these Terms are between you and Wrelik, not Apple, and Wrelik is solely responsible for the App and its content;</li>
          <li>your license is limited to a non-transferable right to use the App on Apple-branded products that you own or control, as permitted by the Apple Media Services Terms and any applicable Family Sharing or volume-purchase rules;</li>
          <li>Apple has no obligation to provide maintenance or support for the App;</li>
          <li>if the App fails to conform to an applicable warranty, you may notify Apple, and Apple may refund the purchase price, if any; to the maximum extent permitted by law, Apple has no other warranty obligation;</li>
          <li>Wrelik, not Apple, is responsible for addressing claims relating to the App, including product-liability, legal-compliance, and consumer-protection claims, and for investigating and resolving intellectual-property infringement claims;</li>
          <li>you represent that you are not located in a country subject to a U.S. government embargo and are not listed on a U.S. government prohibited or restricted party list;</li>
          <li>you must comply with applicable third-party terms when using the App; and</li>
          <li>Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce this section against you.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="17. Changes to these Terms" className={sectionClassName}>
        <p>
          We may update these Terms to reflect changes in the Services, law, or business practices.
          We will post the updated Terms and revise the &quot;Last updated&quot; date. If a change
          materially affects your rights, we will provide additional notice as required. Changes
          apply prospectively. Continued use after the effective date constitutes acceptance where
          permitted by law; if you do not agree, stop using the Service.
        </p>
      </SectionBlock>

      <SectionBlock title="18. General" className={sectionClassName}>
        <p>
          These Terms, the Privacy Policy, the applicable addendum, and any controlling written
          business agreement are the entire agreement about the Services. If a provision is
          unenforceable, it will be modified to the minimum extent necessary and the remainder will
          remain effective. Failure to enforce a provision is not a waiver. You may not assign these
          Terms without Wrelik&apos;s consent; Wrelik may assign them in connection with a merger,
          reorganization, sale of assets, or by operation of law. Headings are for convenience only.
          Electronic notices and acceptance satisfy writing requirements to the extent permitted by
          law.
        </p>
      </SectionBlock>

      <SectionBlock title="19. Contact" className={sectionClassName}>
        <address className="not-italic">
          <strong className="text-white">Wrelik Brands LLC</strong><br />
          Attn: Legal<br />
          1700 Northside Drive<br />
          Atlanta, GA 30318, United States<br />
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">legal@wrelik.com</a>
        </address>
      </SectionBlock>

      <section className="mt-10 border-t border-white/15 pt-10" aria-labelledby="drx-terms-addendum">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">App-specific addendum</p>
        <h2 id="drx-terms-addendum" className="mt-3 text-3xl font-bold text-white">
          Terms Addendum — DRX / Deelrx CRM
        </h2>
        <p className="mt-4 text-text-secondary">This addendum applies when you use DRX, also presented as Deelrx CRM.</p>
      </section>

      <SectionBlock title="1. Business service and authority" className={sectionClassName}>
        <p>
          DRX is offered for authorized business operations. A business customer is responsible for
          its users, configurations, notices, permissions, customer relationships, and instructions.
          Users may access DRX only for the business that authorized them and only within their
          assigned role.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Operational records" className={sectionClassName}>
        <p>
          DRX provides tools for customers, employees and authorized users, inventory, vendors,
          sales, returns, credit, reporting, audit history, and related workflows. It does not
          replace professional accounting, tax, legal, regulatory, safety, or compliance advice.
          The business must verify prices, inventory, taxes, customer balances, reports, and
          transaction results and maintain records required by law.
        </p>
      </SectionBlock>

      <SectionBlock title="3. Regulated retail" className={sectionClassName}>
        <p>
          The business is solely responsible for licenses, product legality, age and identity
          verification, purchase limits, tax treatment, consumer disclosures, privacy notices,
          record retention, recalls, and other rules that apply to its products and locations. DRX
          does not determine whether a proposed transaction is lawful.
        </p>
      </SectionBlock>

      <SectionBlock title="4. Customer and employee data" className={sectionClassName}>
        <p>
          The business represents that it has authority and a lawful basis to enter and process
          customer, employee, vendor, and transaction information. It must honor individual rights
          and limit user access. DRX must not be used as a system for full payment-card data, Social
          Security numbers, protected health information, or other specially regulated data unless
          Wrelik expressly agrees in writing.
        </p>
      </SectionBlock>

      <SectionBlock title="5. Payments and integrations" className={sectionClassName}>
        <p>
          Payment processors, accounting tools, and other integrations are independent services. The
          business is responsible for enabling, configuring, reconciling, and complying with their
          terms. Wrelik is not the merchant of record for the business&apos;s retail sales and does
          not hold customer funds.
        </p>
      </SectionBlock>

      <SectionBlock title="6. AI-assisted operations" className={sectionClassName}>
        <p>
          AI output is advisory and may be incomplete or inaccurate. The business must authorize
          the operational data submitted, provide human review, and may not use DRX AI as the sole
          basis for employment, credit, eligibility, legal-compliance, or other decisions that
          significantly affect a person.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Exports and continuity" className={sectionClassName}>
        <p>
          The business should regularly export or otherwise preserve records available through DRX
          that it needs for legal, tax, audit, or continuity purposes. DRX does not currently offer
          a universal export for every category of business data. Feature availability, beta data,
          and integrations may change, and DRX is not a substitute for the business&apos;s required
          backup and continuity procedures.
        </p>
      </SectionBlock>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="text-neon-lime hover:underline" href="/legal/privacy">Read the Privacy Policy</Link>
        <Link className="text-neon-lime hover:underline" href="/legal">Return to the legal hub</Link>
      </div>
    </PageFrame>
  );
}
