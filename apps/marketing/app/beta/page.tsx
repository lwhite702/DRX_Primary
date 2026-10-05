import type { Metadata } from "next";
import Link from "next/link";

import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { LegalPageView } from "@/components/marketing/site/legal-page-view";

export const metadata: Metadata = {
  title: "Beta Software Agreement & Early Access Disclaimer | Deelrx CRM",
  description:
    "Terms governing participation in DRX / Deelrx CRM preview programs, TestFlight builds, and early-access beta software.",
  alternates: { canonical: "/beta" },
};

const sectionClassName = "mt-6";
const listClassName = "list-disc space-y-2 pl-5";

export default function BetaPage() {
  return (
    <PageFrame>
      <LegalPageView slug="/beta" />
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon-lime">
        Wrelik Brands LLC
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">Beta Software Agreement &amp; Disclaimer</h1>
      <p className="mt-4 text-sm text-text-secondary">
        Effective August 2, 2026 · Last updated September 18, 2026
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        This Beta Software Agreement &amp; Early Access Disclaimer (&quot;Beta Agreement&quot;) governs
        participation in early access previews, private betas, TestFlight evaluation builds, and pilot
        programs for DRX (also presented as Deelrx CRM), operated by Wrelik Brands LLC (&quot;Wrelik&quot;).
        It supplements the Wrelik Terms of Service.
      </p>

      <SectionBlock title="1. Nature of beta software and &quot;AS-IS&quot; provision" className={sectionClassName}>
        <p>
          DRX is in continuous pre-release development. Features, database schemas, network protocols,
          user interfaces, and platform behaviors are experimental, subject to rapid modification, and
          offered solely for evaluation and operational testing.
        </p>
        <p className="font-semibold text-white">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ALL BETA SOFTWARE, PREVIEWS, AND RELATED SERVICES
          ARE PROVIDED STRICTLY &quot;AS IS,&quot; &quot;AS AVAILABLE,&quot; AND &quot;WITH ALL FAULTS,&quot;
          WITHOUT WARRANTY OF ANY KIND, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WRELIK SPECIFICALLY DISCLAIMS
          ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
          NON-INFRINGEMENT.
        </p>
        <p>
          Wrelik does not warrant that beta software will operate without interruption, be error-free,
          preserve all data entries, or satisfy any specific operational requirement of your retail shop.
        </p>
      </SectionBlock>

      <SectionBlock title="2. Known operational boundaries and no service level agreements" className={sectionClassName}>
        <p>
          Beta software does NOT include service level agreements (SLAs), uptime guarantees, or disaster
          recovery commitments. Operating boundaries currently include:
        </p>
        <ul className={listClassName}>
          <li>
            <strong className="text-white">Desktop web primary:</strong> The primary verified interface is
            the desktop web beta. Mobile web and Progressive Web App (PWA) shortcuts provide responsive
            access but do not guarantee offline checkout capabilities.
          </li>
          <li>
            <strong className="text-white">Native iOS and Android access:</strong> Native iPhone builds
            distributed through Apple TestFlight and private Android preview packages are restricted to
            separately invited and authorized testers. Distribution or feature parity is not guaranteed
            across every device model.
          </li>
          <li>
            <strong className="text-white">Unverified beta workflows:</strong> Features labeled beta or
            preview—including purchase orders, automated AI suggestions, delivery fulfillment, and hardware
            scanner configurations—may be modified, gated, or temporarily retired between releases.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="3. Dual-record keeping and merchant backup obligations" className={sectionClassName}>
        <p>
          Because beta software may experience unexpected service interruptions, schema updates, or
          transaction rollbacks, <strong className="text-white">subscribing businesses are required to maintain independent physical records, external register tapes, and periodic exported backups</strong> of all critical business records, including daily sales totals, sales tax collections, customer balances, and physical inventory counts.
        </p>
        <p>
          DRX provides CSV reconciliation export tools in the Reports route. Operators must download and
          securely archive reconciliation files regularly. Wrelik Brands LLC disclaims all responsibility for
          reconstructing lost data or reimbursing business expenses caused by unexpected beta downtime or
          data synchronization failures.
        </p>
      </SectionBlock>

      <SectionBlock title="4. Dedicated fictional test data requirement" className={sectionClassName}>
        <p>
          When evaluating unreleased workflows, training new cashiers, or capturing screenshots for training
          materials, operators must use a dedicated fictional test workspace.
        </p>
        <ul className={listClassName}>
          <li>
            Use neutral, synthetic demonstration data (e.g., <code className="text-neon-lime">Northstar Demo Shop</code>, <code className="text-neon-lime">Sam Reed</code>, and SKU <code className="text-neon-lime">ALP-101</code>).
          </li>
          <li>
            <strong className="text-white">Never</strong> enter real consumer personally identifiable
            information (PII), real employee Social Security numbers, unredacted customer government IDs, or
            live payment-card numbers into experimental beta features.
          </li>
          <li>
            Practice transactions must never be mixed with live commercial retail books or submitted in
            official tax filings.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock title="5. AI recommendations and advisory boundaries" className={sectionClassName}>
        <p>
          Features designated as DRX Intelligence, automated restock alerts, or AI insights generate
          probabilistic suggestions based on historical data patterns.
        </p>
        <p>
          AI suggestions do not approve price overrides, authorize customer credit extensions, adjust
          official inventory counts, or guarantee future sales. Every suggestion must be reviewed and
          authorized by a qualified human store manager prior to operational implementation.
        </p>
      </SectionBlock>

      <SectionBlock title="6. Feedback, telemetry, and assignment of rights" className={sectionClassName}>
        <p>
          Beta testers agree to report bugs, software anomalies, and usability concerns to Wrelik. By
          submitting feedback, error reports, or telemetry, you grant Wrelik Brands LLC an exclusive,
          perpetual, irrevocable, worldwide, royalty-free, fully sublicensable license to incorporate,
          exploit, commercialize, and modify such feedback in any product or service without compensation,
          accounting, or attribution.
        </p>
        <p>
          Beta versions transmit data-minimized crash diagnostics and system telemetry (with customer
          records, retail transactions, and PII scrubbed) to help our engineering team identify
          performance bottlenecks and resolve software bugs.
        </p>
      </SectionBlock>

      <SectionBlock title="7. Confidentiality of pre-release builds" className={sectionClassName}>
        <p>
          All non-public software builds, TestFlight distributions, preview features, release notes,
          unannounced roadmap items, performance benchmarks, and interface designs disclosed to you are the
          confidential and proprietary property of Wrelik Brands LLC.
        </p>
        <p>
          You agree not to copy, reverse engineer, decompile, screenshot, publicly disclose, or distribute
          pre-release software or confidential roadmap details to third parties without prior written
          authorization from Wrelik.
        </p>
      </SectionBlock>

      <SectionBlock title="8. Modification, suspension, and termination" className={sectionClassName}>
        <p>
          Wrelik reserves the right, in its sole and unfettered discretion, to modify, update, suspend, or
          permanently discontinue any beta feature, test build, or preview program at any time with or
          without notice.
        </p>
        <p>
          Wrelik may purge, reset, or archive beta data, test workspaces, and transaction logs without
          liability. Participation in a beta program does not guarantee inclusion in subsequent releases or
          entitle the participant to perpetual free or discounted subscription pricing upon commercial launch.
        </p>
      </SectionBlock>

      <SectionBlock title="9. Beta limitation of liability" className={sectionClassName}>
        <p className="font-semibold text-white">
          IN ADDITION TO THE LIMITATIONS OF LIABILITY SET FORTH IN THE TERMS OF SERVICE, UNDER NO
          CIRCUMSTANCES SHALL WRELIK BRANDS LLC, ITS AFFILIATES, OFFICERS, EMPLOYEES, OR AGENTS BE LIABLE TO
          YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, EXEMPLARY, OR
          CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF DATA, CORRUPTION OF
          RECORDS, OR STORE OPERATIONAL DISRUPTIONS) ARISING OUT OF OR IN CONNECTION WITH YOUR PARTICIPATION IN
          THE BETA PROGRAM, REGARDLESS OF THE LEGAL THEORY ASSERTED, EVEN IF ADVISED OF THE POSSIBILITY OF
          SUCH DAMAGES.
        </p>
        <p className="font-semibold text-white">
          TO THE EXTENT PERMITTED BY LAW, WRELIK&apos;S AGGREGATE LIABILITY UNDER THIS BETA AGREEMENT SHALL BE
          STRICTLY LIMITED TO FIFTY U.S. DOLLARS ($50.00).
        </p>
      </SectionBlock>

      <SectionBlock title="10. Support and inquiries" className={sectionClassName}>
        <p>
          Beta support is provided on a best-efforts basis through our dedicated support channels:
        </p>
        <address className="not-italic text-sm text-text-secondary mt-3">
          <strong className="text-white">Wrelik Brands LLC</strong><br />
          Attn: DRX Beta Operations<br />
          1700 Northside Drive<br />
          Atlanta, GA 30318, United States<br />
          Email:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:support@deelrxcrm.com">
            support@deelrxcrm.com
          </a>{" "}
          · Legal inquiries:{" "}
          <a className="text-neon-lime hover:underline" href="mailto:legal@wrelik.com">
            legal@wrelik.com
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
        <Link className="text-neon-lime hover:underline" href="/legal/regulatory-disclaimer">
          Regulatory Disclaimer
        </Link>
        <Link className="text-neon-lime hover:underline" href="/legal">
          Return to Legal Hub
        </Link>
      </div>
    </PageFrame>
  );
}
