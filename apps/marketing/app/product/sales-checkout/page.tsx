import type { Metadata } from "next";

import { FeatureStatusChip } from "@/components/marketing/site/feature-status-chip";
import { CtaRow } from "@/components/marketing/site/cta-row";
import { PageFrame } from "@/components/marketing/site/page-frame";
import { SectionBlock } from "@/components/marketing/site/section-block";
import { productDetailCanon } from "@/lib/feature-canon";

const content = productDetailCanon["sales-checkout"];

export const metadata: Metadata = {
  title: "Sales & Checkout | DRX",
  description: content.metaDescription,
};

export default function SalesCheckoutPage() {
  return (
    <PageFrame>
      <h1 className="mb-8 text-4xl font-bold text-white">{content.title}</h1>

      <SectionBlock title="What this does">
        <p>{content.what}</p>
      </SectionBlock>

      <SectionBlock title="Why it matters operationally" className="mt-6">
        <p>{content.why}</p>
      </SectionBlock>

      <SectionBlock title="Current feature scope" className="mt-6">
        <ul className="space-y-2">
          {content.proof.map((item) => (
            <li key={item.text} className="flex items-start justify-between gap-2">
              <span>{item.text}</span>
              <FeatureStatusChip status={item.status} />
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock title="Beta constraints" className="mt-6">
        <ul className="space-y-2">
          {content.limitations.map((item) => (
            <li key={item.text} className="flex items-start justify-between gap-2">
              <span>{item.text}</span>
              <FeatureStatusChip status={item.status} />
            </li>
          ))}
        </ul>
        <CtaRow
          location="product_sales_checkout"
          secondaryLabel="See guide"
          secondaryHref="/resources/guides/credit-and-payments"
        />
      </SectionBlock>
    </PageFrame>
  );
}
