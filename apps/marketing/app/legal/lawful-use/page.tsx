import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Lawful Commercial Use Policy | Deelrx CRM",
  description:
    "Mandatory commercial compliance, prohibited goods and transactions, and regulatory boundaries for businesses using DRX / Deelrx CRM.",
  alternates: { canonical: "/legal/lawful-use" },
};

const sectionClassName = "mt-6";
const listClassName = "list-disc space-y-2 pl-5";

export default function LawfulUsePage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/lawful-use" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">Lawful Commercial Use Policy</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Effective August 2, 2026 · Last updated September 18, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        This Lawful Commercial Use Policy (&quot;Policy&quot;) forms an integral, legally binding part of
        the Wrelik Brands LLC Terms of Service. It applies to all subscribing businesses, store owners,
        managers, cashiers, employees, contractors, and authorized users accessing or operating DRX
        (also presented as Deelrx CRM).
      </p>

      <SectionBlock title="1. Commercial scope and mandatory compliance" className={sectionClassName}>
        <p>
          DRX is designed, licensed, and provided exclusively for legitimate, lawful retail commerce.
          Every business customer and authorized operator represents, warrants, and covenants that its
          use of DRX, its product catalog, its sales transactions, and its physical store operations
          comply strictly with all applicable municipal, county, state, provincial, territorial, and
          federal laws, rules, ordinances, and administrative regulations in every jurisdiction where it
          conducts business.
        </p>
        <p>
          Subscribing businesses must hold, maintain, and keep in good standing all required commercial
          operating licenses, retail permits, sales tax registrations, zoning approvals, and corporate
          authorizations. Using DRX without active, valid licenses for your specific retail category is
          a material breach of the Terms of Service and grounds for immediate, unannounced account
          termination.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Strictly prohibited goods and activities" className={sectionClassName}>
        <p>
          DRX software, APIs, mobile applications, and services may not be used, directly or
          indirectly, in connection with or to facilitate any of the following goods, transactions, or
          activities:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Unlicensed or illegal sales:</strong> offering, selling,
            dispensing, or distributing merchandise without all required commercial retail licenses or
            outside legally designated commercial retail premises.
          </li>
          <li>
            <strong className="text-white">Illicit or contraband products:</strong> transactions involving
            unregulated controlled substances, counterfeit merchandise, stolen inventory, unapproved
            pharmaceuticals, or goods prohibited by applicable local, state, or federal law.
          </li>
          <li>
            <strong className="text-white">Fraudulent transaction records:</strong> falsifying sales
            totals, manipulating inventory intake quantities, recording fictitious customer profiles,
            altering recorded payment methods, or concealing taxable revenue.
          </li>
          <li>
            <strong className="text-white">Product diversion and illegal trafficking:</strong> diverting
            regulated retail inventory outside authorized supply chains, evading required state-mandated
            track-and-trace reporting, or selling to unauthorized distributors.
          </li>
          <li>
            <strong className="text-white">Financial crimes:</strong> structuring transactions to evade
            financial reporting thresholds, laundering money, facilitating deceptive credit practices, or
            processing unauthorized credit transactions.
          </li>
          <li>
            <strong className="text-white">Underage access and sales:</strong> selling age-restricted
            merchandise to minors or failing to perform required government-issued photo identification
            checks.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="3. Regulated retail and age-verification duties" className={sectionClassName}>
        <p>
          For businesses operating in regulated retail sectors—including hemp, specialty botanical
          products, tobacco, and age-gated retail goods—the subscribing business bears sole, exclusive,
          and non-delegable responsibility for:
        </p>
        <ul className={listClassName}>
          <li>
            Conducting physical, visual, and electronic age verification using valid government-issued
            photo identification before completing any age-restricted transaction.
          </li>
          <li>
            Enforcing statutory daily, per-transaction, and per-customer quantity and purchase limits
            established by applicable jurisdiction laws.
          </li>
          <li>
            Ensuring all product packaging, child-resistant safety containers, statutory warning labels,
            and batch test certificates comply with commercial standards and consumer protection laws.
          </li>
          <li>
            Ensuring store hours, promotional practices, and retail displays comply with local zoning and
            commercial operating ordinances.
          </li>
        </ul>
        <p>
          DRX provides operational register workflows, optional customer profiles, and stock-tracking
          tools. DRX does not independently verify the physical age, identity, or legal capacity of any
          customer or operator, and cannot confirm whether a specific transaction is legally authorized.
        </p>
      </SectionBlock>

      <SectionBlock title="4. Operational records vs. legal and professional advice" className={sectionClassName}>
        <p>
          DRX is an operational operating system designed to assist store staff with day-to-day inventory
          counts, register checkout, customer balances, and shift summaries. DRX is not a law firm,
          accounting firm, tax advisor, financial institution, or regulatory compliance authority.
        </p>
        <p>
          Receipts, transaction logs, inventory adjustment entries, audit histories, and reporting totals
          generated by DRX represent operational records entered by store staff. They do not constitute
          certified accounting audits, legal compliance certificates, or official tax returns. Every
          business must consult licensed legal, tax, and accounting professionals to verify its
          compliance posture, employee handbooks, and regulatory filings.
        </p>
      </SectionBlock>

      <SectionBlock title="5. Customer store accounts and credit boundaries" className={sectionClassName}>
        <p>
          DRX allows authorized operators to record customer store balances (&quot;Store Credit&quot;)
          and payments toward open accounts. When using these features, the business acknowledges and
          agrees:
        </p>
        <ul className={listClassName}>
          <li>
            DRX is not a bank, lender, credit card issuer, consumer reporting agency, money transmitter,
            or debt collection agency. DRX records the ledger balance; it does not extend credit, fund
            loans, or collect debts.
          </li>
          <li>
            The business is solely responsible for establishing fair credit policies, complying with
            state and federal lending disclosures, state usury limits, the Truth in Lending Act (TILA),
            the Fair Debt Collection Practices Act (FDCPA), and applicable state consumer credit laws.
          </li>
          <li>
            Unclaimed store credits, outstanding customer balances, and abandoned funds must be handled
            in accordance with state escheatment and unclaimed property statutes.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="6. Local delivery and courier fulfillment" className={sectionClassName}>
        <p>
          When utilizing DRX delivery tracking or vendor courier dispatch features, the subscribing
          business remains solely responsible for:
        </p>
        <ul className={listClassName}>
          <li>
            Ensuring retail delivery is legally permitted in both the originating store jurisdiction and
            the delivery destination address.
          </li>
          <li>
            Complying with courier licensing, vehicle registration, transport security, and manifest
            regulations.
          </li>
          <li>
            Ensuring that recipient age and identity verification are performed upon physical delivery
            before merchandise is handed over.
          </li>
          <li>
            Protecting recipient address privacy by adhering to the audited address reveal protocols
            provided in the DRX delivery console.
          </li>
        </ul>
        <p>
          Wrelik Brands LLC does not act as a common carrier, transportation broker, or delivery courier,
          and assumes no responsibility for delivery transit, courier conduct, or transport safety.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Audit trails, monitoring, and immediate termination" className={sectionClassName}>
        <p>
          DRX maintains immutable system audit trails of inventory movements, user logins, permission
          changes, delivery address reveals, and transaction histories. Wrelik reserves the right,
          without prior notice or liability, to immediately suspend or permanently terminate any
          workspace, account, or user access if:
        </p>
        <ul className={listClassName}>
          <li>We detect or receive credible reports of illegal activity or prohibited transactions.</li>
          <li>A regulatory agency, law enforcement body, or court of competent jurisdiction issues an order or inquiry regarding the business.</li>
          <li>The business fails to provide evidence of valid operating licenses upon request.</li>
          <li>The service is operated in a manner that creates legal, regulatory, or operational risk for Wrelik Brands LLC or other platform users.</li>
        </ul>
        <p>
          Termination for unlawful conduct immediately revokes all software licenses, forfeits prepaid
          fees, and may result in formal reporting to law enforcement or regulatory authorities where
          required by law.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Actionable operator tips: How to keep your retail business fully legal" className={sectionClassName}>
        <p>
          Operating a regulated or independent retail store requires proactive compliance habits. We
          recommend store owners and managers integrate these practical procedures into daily routines:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Verify and display active licenses:</strong> Keep current
            commercial retail permits, municipal business licenses, and state sales tax registrations
            prominently posted on the premises as required by law. Calendar renewal deadlines 60 days in
            advance.
          </li>
          <li>
            <strong className="text-white">Implement a strict 100% ID-check standard:</strong> Train all
            cashiers to physically inspect valid, unexpired government photo identification for every
            age-restricted transaction, regardless of customer appearance. Never bypass an ID check.
          </li>
          <li>
            <strong className="text-white">Configure accurate sales tax rates:</strong> Check tax rates with
            your local taxing jurisdiction at least quarterly. Update the sales tax percentage in DRX
            Settings whenever municipal or state rates adjust.
          </li>
          <li>
            <strong className="text-white">Maintain written customer credit policies:</strong> If offering
            in-store credit accounts, issue clear written agreements specifying repayment timelines, credit
            limits, and store policies. Never assess finance charges or interest unless properly licensed as
            a commercial lender.
          </li>
          <li>
            <strong className="text-white">Audit supplier manifests &amp; inventory intake:</strong> Only
            purchase inventory from verified, licensed commercial distributors. Count delivered goods
            immediately and record intakes in DRX with actual product costs and supplier notes before
            placing items on retail shelves.
          </li>
          <li>
            <strong className="text-white">Daily register and cash drawer balancing:</strong> Reconcile
            cashier drawer counts with DRX shift totals at every shift change. Investigate discrepancies
            promptly and maintain bank deposit receipts for your certified accountant.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="9. Indemnification and defense" className={sectionClassName}>
        <p>
          The subscribing business agrees to defend, indemnify, and hold harmless Wrelik Brands LLC,
          its parent, affiliates, officers, directors, employees, agents, and licensors from and
          against any and all claims, regulatory investigations, administrative enforcement actions,
          fines, penalties, damages, judgments, liabilities, losses, costs, and expenses (including
          reasonable attorneys&apos; fees) arising out of or related to:
        </p>
        <ul className={listClassName}>
          <li>Any violation of this Lawful Commercial Use Policy by the business or its users;</li>
          <li>The sale, marketing, storage, transport, or distribution of any merchandise by the business;</li>
          <li>Any failure to verify customer age, identity, or purchasing eligibility; or</li>
          <li>Any dispute between the business and its retail customers, employees, or regulatory agencies.</li>
        </ul>
      </SectionBlock>

      <SectionBlock title="10. Reporting violations and legal contact" className={sectionClassName}>
        <p>
          If you suspect or become aware of any unlawful activity, fraudulent records, or violations of
          this Policy involving a DRX workspace, contact Wrelik Legal immediately:
        </p>
        <address className="not-italic text-sm text-text-secondary mt-3">
          <strong className="text-white">Wrelik Brands LLC</strong><br />
          Attn: Legal &amp; Compliance<br />
          1700 Northside Drive<br />
          Atlanta, GA 30318, United States<br />
          Email:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">
            legal@wrelik.com
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
        <Link className="text-neon-lime hover:underline" href="/legal/privacy">
          Privacy Policy
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
