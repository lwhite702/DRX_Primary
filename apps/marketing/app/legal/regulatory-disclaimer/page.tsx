import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Regulatory & Operational Disclaimer | Deelrx CRM",
  description:
    "Statutory non-advice notice, healthcare disclaimers, tax boundaries, and operational limits for DRX / Deelrx CRM.",
  alternates: { canonical: "/legal/regulatory-disclaimer" },
};

const sectionClassName = "mt-6";
const listClassName = "list-disc space-y-2 pl-5";

export default function RegulatoryDisclaimerPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/legal/regulatory-disclaimer" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">Regulatory &amp; Operational Disclaimer</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Effective August 2, 2026 · Last updated September 18, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        This Regulatory &amp; Operational Disclaimer (&quot;Disclaimer&quot;) clarifies the operational
        boundaries, statutory limitations, and legal non-advisory status of DRX (also presented as
        Deelrx CRM), operated by Wrelik Brands LLC. It applies to all subscribing businesses, operators,
        and platform users.
      </p>

      <SectionBlock title="1. Operational software only — no professional advice" className={sectionClassName}>
        <p>
          DRX is cloud-based business management software designed for day-to-day inventory organization,
          point-of-sale checkout, customer store accounts, and operational reporting. DRX is NOT a law firm,
          certified public accounting firm, financial advisory practice, tax consult, or compliance
          auditor.
        </p>
        <p>
          No information, calculation, suggested field, dashboard metric, report total, export file, or
          customer support communication provided by DRX or Wrelik Brands LLC constitutes legal, tax,
          accounting, investment, lending, medical, or regulatory compliance advice. No attorney-client,
          accountant-client, or fiduciary relationship is created through your access to or use of the
          Services.
        </p>
        <p>
          Subscribing businesses must engage independent licensed legal counsel, certified public
          accountants, and professional tax advisors to verify compliance with all local, state,
          provincial, and federal statutory mandates.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Healthcare, medical, and pharmacy disclaimer" className={sectionClassName}>
        <p>
          DRX is commercial operating software engineered for independent retail store operators.
          <strong className="text-white"> DRX is NOT a pharmacy management system, healthcare software, medical device, or prescription dispensing platform.</strong>
        </p>
        <ul className={listClassName}>
          <li>
            DRX is not configured, certified, or intended for dispensing prescription pharmaceuticals,
            compounding medications, or processing medical health insurance claims.
          </li>
          <li>
            DRX is not designed to comply with the Health Insurance Portability and Accountability Act
            (HIPAA) for Covered Entities or Business Associates, and Wrelik Brands LLC will not execute
            Business Associate Agreements (BAAs) for standard DRX accounts.
          </li>
          <li>
            Subscribing businesses and operators may NOT enter protected health information (PHI),
            medical records, prescription data, or clinical notes into DRX.
          </li>
          <li>
            Any operational descriptions of product attributes (such as cannabinoid ratios or ingredient
            percentages) are merchant-entered retail inventory catalog fields and do not constitute health,
            medical, therapeutic, or dietary claims.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="3. Sales tax, excise tax, and statutory calculations" className={sectionClassName}>
        <p>
          DRX provides configurable numeric fields enabling merchants to apply sales tax rates, delivery
          fees, and line-item discounts at point-of-sale checkout. Regarding taxation:
        </p>
        <ul className={listClassName}>
          <li>
            DRX does not calculate sales tax nexus, determine statutory taxability of specific product
            classes, monitor changes in local tax jurisdictions, or remit taxes to government authorities.
          </li>
          <li>
            The subscribing business is solely responsible for determining the correct tax rates,
            configuring tax calculations in Settings, collecting applicable retail sales and excise taxes,
            filing periodic returns, and remitting all taxes owed to appropriate municipal, state, and
            federal taxing authorities.
          </li>
          <li>
            Wrelik Brands LLC disclaims all liability for tax calculation discrepancies, under-collection,
            over-collection, audit assessments, penalties, or interest imposed by any taxing authority.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="4. Operational logs vs. certified financial statements" className={sectionClassName}>
        <p>
          All transaction receipts, cashier shift logs, inventory adjustment entries, order summaries, and
          period reports generated by DRX represent operational records recorded by your staff and
          contractors during retail shifts.
        </p>
        <p>
          These records do NOT constitute certified financial statements prepared in accordance with
          Generally Accepted Accounting Principles (GAAP) or International Financial Reporting Standards
          (IFRS). Store managers and owners must independently perform physical inventory audits, reconcile
          cash registers with physical bank deposits, and verify all balances against external financial
          institutions.
        </p>
      </SectionBlock>

      <SectionBlock title="5. Banking, payment processing, and merchant of record" className={sectionClassName}>
        <p>
          DRX facilitates the recording of payment methods (such as cash, third-party payment card, or
          customer store account balances). Wrelik Brands LLC:
        </p>
        <ul className={listClassName}>
          <li>
            Is NOT a bank, credit union, depository institution, money transmitter, or payment network.
          </li>
          <li>
            Is NOT the merchant of record for any retail sale transacted by a subscribing business.
          </li>
          <li>
            Does NOT hold, escrow, settle, or guarantee customer funds, payments, refunds, or retail
            merchandise deposits.
          </li>
        </ul>
        <p>
          Payment card processing, hardware card readers, and bank payouts are handled entirely by the
          merchant&apos;s independent third-party merchant service providers subject to their own commercial
          contracts.
        </p>
      </SectionBlock>

      <SectionBlock title="6. Local licensing and municipal certifications" className={sectionClassName}>
        <p>
          Commercial retail laws vary widely by city, county, state, and country. Wrelik Brands LLC makes no
          warranty, representation, or covenant that DRX satisfies specific municipal retail system
          specifications, state track-and-trace integration certifications, or local regulatory reporting
          protocols unless expressly confirmed in an executed enterprise agreement.
        </p>
        <p>
          Each store operator must independently evaluate whether DRX satisfies their local licensing board
          mandates before relying on the platform for daily operations.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Limitation of liability for regulatory enforcement" className={sectionClassName}>
        <p className="font-semibold text-white">
          TO THE FULLEST EXTENT PERMITTED BY LAW, WRELIK BRANDS LLC, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND
          LICENSORS SHALL NOT BE LIABLE FOR ANY REGULATORY FINES, LICENSING SUSPENSIONS, CIVIL OR CRIMINAL
          PENALTIES, TAX ASSESSMENTS, RECLASSIFICATIONS, STORE CLOSURES, OR LOSS OF BUSINESS STANDING
          INCURRED BY A SUBSCRIBING BUSINESS OR OPERATOR ARISING OUT OF OR IN CONNECTION WITH THE USE OF DRX.
        </p>
        <p>
          Sole responsibility for legal operation, regulatory compliance, and business licensure rests
          unconditionally with the subscribing store owner and operating entity.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Inquiries and contact" className={sectionClassName}>
        <address className="not-italic text-sm text-text-secondary">
          <strong className="text-white">Wrelik Brands LLC</strong><br />
          Attn: Legal &amp; Regulatory Compliance<br />
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
        <Link className="text-neon-lime hover:underline" href="/legal/lawful-use">
          Lawful Commercial Use Policy
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
