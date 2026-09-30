import Link from "next/link";
import { marketingContent } from "@/lib/marketing-content";
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
import { ComingSoonOrdering } from "./coming-soon-ordering";
import { MarketingFooter } from "./footer";
import { appWaitlistUrl } from "@/lib/app-links";

const faqItems = marketingContent.faq;

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
          className="relative w-full overflow-hidden border-b border-border/40 py-12 md:py-16 lg:py-24"
          aria-label="Hero"
        >
          {/* Operator Grid Background */}
          <div
            className="operator-grid absolute inset-0 pointer-events-none opacity-45"
            aria-hidden="true"
          />

          {/* Luminous Lime Green Gradient Glow */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <div className="hero-lime-glow absolute -top-[140px] left-1/2 -translate-x-1/2 w-[720px] md:w-[980px] h-[520px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.18)_0%,rgba(16,185,129,0.07)_45%,transparent_70%)] blur-[42px] pointer-events-none" />
            <div className="absolute top-[25%] -right-[80px] w-[450px] h-[380px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.10)_0%,transparent_65%)] blur-[48px] pointer-events-none" />
            <div className="absolute top-[35%] -left-[100px] w-[400px] h-[320px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_60%)] blur-[44px] pointer-events-none" />
          </div>

          <div className="relative z-10 mx-auto max-w-[1280px] px-5 md:px-8 lg:px-10">
            <div className="flex flex-col justify-between gap-10 text-left lg:flex-row lg:items-center lg:gap-14">
              {/* Hero Copy */}
              <div className="flex max-w-[560px] flex-1 flex-col gap-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[12px] font-mono font-medium text-accent w-fit">
                  <span className="relative flex size-2">
                    <span className="animate-beacon-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-accent" />
                  </span>
                  {marketingContent.hero.preheadline}
                </div>

                <h1 className="font-display text-[32px] md:text-[40px] lg:text-[48px] font-extrabold leading-[38px] md:leading-[48px] lg:leading-[56px] tracking-tight text-text-primary">
                  {marketingContent.hero.headlineLead}{" "}
                  <span className="text-accent underline decoration-accent/35 decoration-2 underline-offset-4">
                    {marketingContent.hero.headlineAccent}
                  </span>
                </h1>

                <p className="text-[16px] md:text-[18px] font-normal leading-[26px] md:leading-[28px] text-text-primary/90">
                  {marketingContent.hero.subheadline}
                </p>

                {/* Hero Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href={appWaitlistUrl}
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[12px] bg-accent px-6 text-[14px] font-semibold text-black transition-colors hover:bg-[#dbff47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {marketingContent.hero.primaryCta.label}
                  </Link>
                  <Link
                    href="#workflows"
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[12px] border border-border bg-surface px-6 text-[14px] font-medium text-text-primary hover:bg-white/5 hover:border-accent/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    See how it works
                  </Link>
                </div>

                <p className="text-[13px] md:text-[14px] font-normal leading-[20px] text-muted-foreground">
                  Closed beta · Join the list for early access. Features and availability vary by platform.
                </p>
              </div>

              {/* Product Proof Realistic Renders */}
              <div className="flex min-w-0 w-full justify-center lg:max-w-[520px] lg:justify-end">
                <MarketingProductProof />
              </div>
            </div>
          </div>
        </section>

        {/* 03 Value Statement Section */}
        <section
          id="product"
          className="w-full py-16 md:py-20 lg:py-24 bg-surface border-b border-border/40"
          aria-labelledby="value-heading"
        >
          <div className="mx-auto max-w-[1280px] px-5 md:px-8 lg:px-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-16 text-left">
              {/* Heading */}
              <div className="flex-1 max-w-[520px]">
                <p className="text-[14px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
                  Built around the shift, not the desk.
                </p>
                <h2
                  id="value-heading"
                  className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary"
                >
                  The work moves.{" "}
                  <span className="text-accent">Your setup should too.</span>
                </h2>
              </div>

              {/* Detail */}
              <div className="flex-1 max-w-[560px] flex flex-col gap-4">
                <p className="text-[16px] md:text-[18px] font-normal leading-[26px] md:leading-[28px] text-text-primary/90">
                  A customer calls while you’re out. Stock lands in the back
                  room. Somebody pays late. DRX keeps the sale, customer,
                  stock, and payment history tied to the right business.
                </p>
                <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">
                  Review saved sales, check stock, and see balances due before
                  the next customer comes in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 04 Primary Workflows Section */}
        <section
          id="workflows"
          className="w-full py-16 md:py-20 lg:py-24 border-b border-border/40"
          aria-labelledby="workflows-heading"
        >
          <div className="mx-auto max-w-[1280px] px-5 md:px-8 lg:px-10 text-left">
            <div className="max-w-[760px] mb-12">
              <p className="text-[14px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
                Shift Operations
              </p>
              <h2
                id="workflows-heading"
                className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary mb-3"
              >
                The <span className="text-accent">whole shift</span>, not just checkout.
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                Keep products, sales, and recorded payments together.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <CapabilityCard
                icon={<ShoppingCart className="size-5" />}
                title="Sell without the detour"
                body="Find products, check the sale, choose a customer, and record how they paid."
                ctaText="See the sale flow →"
                ctaHref="/product"
                visual="checkout"
              />
              <CapabilityCard
                icon={<Package className="size-5" />}
                title="Know what you actually have"
                body="Add stock, fix counts, and see what needs attention before you promise it."
                ctaText="See products →"
                ctaHref="/product"
                visual="inventory"
              />
              <CapabilityCard
                icon={<Users className="size-5" />}
                title="Keep money and people straight"
                body="Review customer history, recorded payments, and balances due in one place."
                ctaText="See customer tools →"
                ctaHref="/product"
                visual="customers"
              />
            </div>
          </div>
        </section>

        {/* 04b Customer Ordering Research Teaser */}
        <ComingSoonOrdering />

        {/* 05 Privacy Evidence Section */}
        <section
          id="privacy"
          className="w-full py-16 md:py-20 lg:py-24 bg-surface border-b border-border/40"
          aria-labelledby="privacy-heading"
        >
          <div className="mx-auto max-w-[1280px] px-5 md:px-8 lg:px-10 text-left">
            <div className="max-w-[760px] mb-12">
              <p className="text-[14px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
                Trust &amp; Boundaries
              </p>
              <h2
                id="privacy-heading"
                className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary mb-3"
              >
                Private by default. <span className="text-accent">Clear when it matters.</span>
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                The important customer and financial details are protected without hiding what you need to run the shift.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <EvidenceItem
                icon={<Building2 className="size-5" />}
                title="Business context stays visible"
                body="Check the selected business before working with customers, stock, or sales."
              />
              <EvidenceItem
                icon={<EyeOff className="size-5" />}
                title="Details stay hidden until you need them"
                body="Choose what customer details to save and who on your team can see them."
              />
              <EvidenceItem
                icon={<CheckCircle2 className="size-5" />}
                title="Keep a history of the work"
                body="Check saved sales and stock history before making another change."
              />
            </div>
          </div>
        </section>

        {/* 06 Platform Availability Section */}
        <section
          id="apps"
          className="w-full py-16 md:py-20 lg:py-24 border-b border-border/40"
          aria-labelledby="apps-heading"
        >
          <div className="mx-auto max-w-[1280px] px-5 md:px-8 lg:px-10 text-left">
            <div className="max-w-[820px] mb-12">
              <p className="text-[14px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
                Early access
              </p>
              <h2
                id="apps-heading"
                className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary mb-3"
              >
                Your business. <span className="text-accent">More ways to keep up.</span>
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                DRX is in closed beta. Access and supported tasks vary by platform;
                join the list for availability updates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <div className="border-t border-border pt-5 text-left transition-colors duration-200 hover:border-accent/40">
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent font-semibold">
                  Apple iOS
                </span>
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mt-2 mb-3">
                  Native iOS app
                </h3>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  Native iPhone workflows are being checked in beta. Store availability
                  will be announced after release verification.
                </p>
              </div>

              <div className="border-t border-border pt-5 text-left transition-colors duration-200 hover:border-accent/40">
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent font-semibold">
                  Google Android
                </span>
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mt-2 mb-3">
                  Android app
                </h3>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  Android beta includes sales, customers, and stock. Offline checkout
                  requires your business owner’s setup and approval.
                </p>
              </div>

              <div className="border-t border-border pt-5 text-left transition-colors duration-200 hover:border-accent/40">
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent font-semibold">
                  Web &amp; PWA
                </span>
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mt-2 mb-3">
                  Mobile web + PWA
                </h3>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  Use the web app on a phone, tablet, or desktop during beta.
                  Supported browsers can also install it to the home screen.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 07 Conversion, FAQ & Footer Section */}
        <section
          id="faq"
          className="w-full py-16 md:py-20 lg:py-24"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-[1280px] px-5 md:px-8 lg:px-10 flex flex-col gap-14 md:gap-16 lg:gap-20">
            {/* CTA Band */}
            <MarketingCtaBand />

            {/* FAQ Accordion Section */}
            <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-16 text-left">
              <div className="max-w-[360px] shrink-0">
                <h2
                  id="faq-heading"
                  className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary mb-3"
                >
                  Questions, <span className="text-accent">answered straight.</span>
                </h2>
                <p className="text-[15px] md:text-[16px] font-normal leading-[24px] text-muted-foreground">
                  The basics before you join early access.
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
