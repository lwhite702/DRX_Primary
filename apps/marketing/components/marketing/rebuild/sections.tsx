import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  EyeOff,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import { MarketingNav } from "./nav";
import { MarketingAppSuggestion } from "./app-suggestion";
import { MarketingProductProof } from "./product-proof";
import { CapabilityCard } from "./capability-card";
import { EvidenceItem } from "./evidence-item";
import { FaqAccordion } from "./faq-accordion";
import { MarketingCtaBand } from "./cta-band";
import { MarketingFooter } from "./footer";
import { appWaitlistUrl } from "@/lib/app-links";

const faqItems = [
  {
    question: "Can I run DRX without a desktop?",
    answer:
      "Yes. Core setup and daily operating work are designed to be completed from a phone.",
  },
  {
    question: "What happens when the signal drops?",
    answer:
      "Supported work stays on the device, pending sync remains visible, and conflicts are presented for review.",
    defaultOpen: true,
  },
  {
    question: "Can I manage more than one business?",
    answer:
      "Yes. Each business keeps its own records and permissions, and the active business stays visible.",
  },
  {
    question: "Does the app suggestion block my work?",
    answer:
      "No. It is dismissible, stays out of the workflow, and waits 14 days before appearing again.",
  },
];

export function RebuiltMarketingSections() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      {/* 01 Navigation */}
      <MarketingNav />

      {/* Mobile App Suggestion Banner */}
      <MarketingAppSuggestion />

      {/* Main Content Landmark */}
      <main id="main-content" className="flex-1 w-full">
        {/* 02 Hero Section */}
        <section
          className="w-full py-12 md:py-16 lg:py-20 border-b border-border/40"
          aria-label="Hero"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 lg:gap-12 text-left">
              {/* Hero Copy */}
              <div className="flex-1 max-w-[560px] flex flex-col gap-6">
                <h1 className="font-display text-[32px] md:text-[38px] lg:text-[44px] font-extrabold leading-[38px] md:leading-[46px] lg:leading-[52px] tracking-tight text-text-primary">
                  Run your business from the phone in your hand.
                </h1>

                <p className="text-[16px] md:text-[18px] font-normal leading-[26px] md:leading-[28px] text-text-primary/90">
                  Sell, track stock, manage customers, collect what’s owed, and
                  keep every business separate. DRX keeps the work together
                  without making you sit at a desk.
                </p>

                {/* Hero Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href={appWaitlistUrl}
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[12px] bg-accent px-6 text-[14px] font-medium text-primary-foreground hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Get started
                  </Link>
                  <Link
                    href="#workflows"
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[12px] border border-border bg-surface px-6 text-[14px] font-medium text-text-primary hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    See how it works
                  </Link>
                </div>

                <p className="text-[13px] md:text-[14px] font-normal leading-[20px] text-muted-foreground">
                  iPhone · Android · Mobile web · PWA &nbsp;|&nbsp; No desktop
                  required for daily work.
                </p>
              </div>

              {/* Product Proof Clones */}
              <div className="flex justify-center lg:justify-end shrink-0">
                <MarketingProductProof />
              </div>
            </div>
          </div>
        </section>

        {/* 03 Value Statement Section */}
        <section
          id="product"
          className="w-full py-14 md:py-16 lg:py-20 bg-surface border-b border-border/40"
          aria-labelledby="value-heading"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-16 text-left">
              {/* Heading */}
              <div className="flex-1 max-w-[520px]">
                <p className="text-[14px] font-normal leading-[20px] text-accent mb-2">
                  Built around the shift, not the desk.
                </p>
                <h2
                  id="value-heading"
                  className="font-display text-[28px] md:text-[32px] lg:text-[36px] font-bold leading-[36px] md:leading-[40px] lg:leading-[44px] tracking-[-0.5px] text-text-primary"
                >
                  The work moves. Your setup should too.
                </h2>
              </div>

              {/* Detail */}
              <div className="flex-1 max-w-[560px] flex flex-col gap-4">
                <p className="text-[16px] md:text-[18px] font-normal leading-[26px] md:leading-[28px] text-text-primary/90">
                  A customer calls while you’re out. Stock lands in the back
                  room. Somebody pays late. DRX keeps the sale, customer,
                  inventory, and credit history tied to the right business
                  wherever you are.
                </p>
                <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">
                  Every change shows whether it is saved, pending, offline, or
                  needs review.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 04 Primary Workflows Section */}
        <section
          id="workflows"
          className="w-full py-14 md:py-16 lg:py-20 border-b border-border/40"
          aria-labelledby="workflows-heading"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 text-left">
            <div className="max-w-[760px] mb-10">
              <h2
                id="workflows-heading"
                className="font-display text-[28px] md:text-[32px] lg:text-[36px] font-bold leading-[36px] md:leading-[40px] lg:leading-[44px] tracking-[-0.5px] text-text-primary mb-3"
              >
                The whole shift, not just checkout.
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                DRX follows the work from the first item to the final payment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <CapabilityCard
                icon={<ShoppingCart className="size-6" />}
                title="Sell without the detour"
                body="Build the sale, review it, choose a customer, record payment, and finish without losing the draft."
                ctaText="See the sale flow →"
                ctaHref="/product"
              />
              <CapabilityCard
                icon={<Package className="size-6" />}
                title="Know what you actually have"
                body="Add stock, adjust counts, scan products, and see what needs attention before you promise it."
                ctaText="Open inventory →"
                ctaHref="/product"
              />
              <CapabilityCard
                icon={<Users className="size-6" />}
                title="Keep money and people straight"
                body="Customer history, payments, credits, and deliveries stay connected without scattered notes."
                ctaText="See customer tools →"
                ctaHref="/product"
              />
            </div>
          </div>
        </section>

        {/* 05 Privacy Evidence Section */}
        <section
          id="privacy"
          className="w-full py-14 md:py-16 lg:py-20 bg-surface border-b border-border/40"
          aria-labelledby="privacy-heading"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 text-left">
            <div className="max-w-[760px] mb-10">
              <h2
                id="privacy-heading"
                className="font-display text-[28px] md:text-[32px] lg:text-[36px] font-bold leading-[36px] md:leading-[40px] lg:leading-[44px] tracking-[-0.5px] text-text-primary mb-3"
              >
                Private by default. Clear when it matters.
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                The important details are protected without hiding what you need
                to run the shift.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <EvidenceItem
                icon={<Building2 className="size-6" />}
                title="Business context stays visible"
                body="Customers, stock, permissions, and pending sync stay attached to the selected business."
              />
              <EvidenceItem
                icon={<EyeOff className="size-6" />}
                title="Details stay hidden until you need them"
                body="Contact details and money values can remain masked, then reveal only when the operator chooses."
              />
              <EvidenceItem
                icon={<CheckCircle2 className="size-6" />}
                title="Every change has a visible state"
                body="Saved, pending, offline, restricted, and conflict states always explain the safe next step."
              />
            </div>
          </div>
        </section>

        {/* 06 Platform Availability Section */}
        <section
          id="apps"
          className="w-full py-14 md:py-16 lg:py-20 border-b border-border/40"
          aria-labelledby="apps-heading"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 text-left">
            <div className="max-w-[820px] mb-10">
              <h2
                id="apps-heading"
                className="font-display text-[28px] md:text-[32px] lg:text-[36px] font-bold leading-[36px] md:leading-[40px] lg:leading-[44px] tracking-[-0.5px] text-text-primary mb-3"
              >
                One operation. Whichever phone you use.
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                The same business, permissions, and sync state follow you across
                every supported mobile surface.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <div className="border-t border-border pt-5 text-left">
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-3">
                  Native iOS app
                </h3>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  Fast, one-handed daily work with biometrics, camera tools, and
                  interruption recovery.
                </p>
              </div>

              <div className="border-t border-border pt-5 text-left">
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-3">
                  Android app
                </h3>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  Material-aware controls and the same complete operating
                  workflow from start to finish.
                </p>
              </div>

              <div className="border-t border-border pt-5 text-left">
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-3">
                  Mobile web + PWA
                </h3>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  Install from the browser or keep working there. The app
                  suggestion stays optional and dismissible.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 07 Conversion, FAQ & Footer Section */}
        <section
          id="faq"
          className="w-full py-14 md:py-16 lg:py-20"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 flex flex-col gap-14 md:gap-16 lg:gap-20">
            {/* CTA Band */}
            <MarketingCtaBand />

            {/* FAQ Accordion Section */}
            <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-16 text-left">
              <div className="max-w-[360px] shrink-0">
                <h2
                  id="faq-heading"
                  className="font-display text-[28px] md:text-[32px] lg:text-[36px] font-bold leading-[36px] md:leading-[40px] lg:leading-[44px] tracking-[-0.5px] text-text-primary mb-3"
                >
                  Questions, answered straight.
                </h2>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  The basics before you start running the day from your phone.
                </p>
              </div>

              <div className="flex-1 max-w-[760px]">
                <FaqAccordion items={faqItems} />
              </div>
            </div>

            {/* 08 Footer */}
            <MarketingFooter />
          </div>
        </section>
      </main>
    </div>
  );
}
