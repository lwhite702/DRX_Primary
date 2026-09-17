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
import { IphoneRender, BrowserRender } from "./device-renders";
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
          className="relative w-full py-12 md:py-16 lg:py-24 border-b border-border/40 overflow-hidden"
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

          <div className="relative z-10 mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 lg:gap-14 text-left">
              {/* Hero Copy */}
              <div className="flex-1 max-w-[560px] flex flex-col gap-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[12px] font-mono font-medium text-accent w-fit">
                  <span className="relative flex size-2">
                    <span className="animate-beacon-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-accent" />
                  </span>
                  Mobile-First Retail POS &amp; Operations
                </div>

                <h1 className="font-display text-[32px] md:text-[40px] lg:text-[48px] font-extrabold leading-[38px] md:leading-[48px] lg:leading-[56px] tracking-tight text-text-primary">
                  Run your business from the{" "}
                  <span className="text-accent underline decoration-accent/35 decoration-2 underline-offset-4">
                    phone in your hand.
                  </span>
                </h1>

                <p className="text-[16px] md:text-[18px] font-normal leading-[26px] md:leading-[28px] text-text-primary/90">
                  <span className="text-accent font-medium">
                    Sell, track stock, manage customers, and collect what’s owed
                  </span>
                  — all while keeping every retail operation strictly separated.
                  DRX keeps the work together without making you sit at a desk.
                </p>

                {/* Hero Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href={appWaitlistUrl}
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[12px] bg-accent px-6 text-[14px] font-semibold text-black hover:opacity-95 hover:shadow-[0_0_24px_rgba(204,255,0,0.35)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Get started
                  </Link>
                  <Link
                    href="#workflows"
                    className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-[12px] border border-border bg-surface px-6 text-[14px] font-medium text-text-primary hover:bg-white/5 hover:border-accent/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    See how it works
                  </Link>
                </div>

                <p className="text-[13px] md:text-[14px] font-normal leading-[20px] text-muted-foreground">
                  <span className="text-text-primary font-medium">iPhone</span> ·{" "}
                  <span className="text-text-primary font-medium">Android</span> ·{" "}
                  <span className="text-text-primary font-medium">Mobile web</span> ·{" "}
                  <span className="text-text-primary font-medium">PWA</span> &nbsp;|&nbsp; No desktop
                  required for daily work.
                </p>
              </div>

              {/* Product Proof Realistic Renders */}
              <div className="flex justify-center lg:justify-end shrink-0">
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
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0">
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
                  inventory, and credit history tied to the right business
                  wherever you are.
                </p>
                <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">
                  Every change shows whether it is{" "}
                  <span className="text-emerald-400 font-medium">saved</span>,{" "}
                  <span className="text-amber-400 font-medium">pending</span>,{" "}
                  <span className="text-accent font-medium">offline</span>, or
                  needs review.
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
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 text-left">
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
                DRX follows the work from the first barcode scan to the final payment settlement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9">
              <CapabilityCard
                icon={<ShoppingCart className="size-5" />}
                title="Sell without the detour"
                body="Build the sale, review it, choose a customer, record payment, and finish without losing the draft."
                ctaText="See the sale flow →"
                ctaHref="/product"
              />
              <CapabilityCard
                icon={<Package className="size-5" />}
                title="Know what you actually have"
                body="Add stock, adjust counts, scan products, and see what needs attention before you promise it."
                ctaText="Open inventory →"
                ctaHref="/product"
              />
              <CapabilityCard
                icon={<Users className="size-5" />}
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
          className="w-full py-16 md:py-20 lg:py-24 bg-surface border-b border-border/40"
          aria-labelledby="privacy-heading"
        >
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 text-left">
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
                body="Customers, stock, permissions, and pending sync stay attached to the selected business."
              />
              <EvidenceItem
                icon={<EyeOff className="size-5" />}
                title="Details stay hidden until you need them"
                body="Contact details and money values can remain masked, then reveal only when the operator chooses."
              />
              <EvidenceItem
                icon={<CheckCircle2 className="size-5" />}
                title="Every change has a visible state"
                body="Saved, pending, offline, restricted, and conflict states always explain the safe next step."
              />
            </div>
          </div>
        </section>

        {/* 06 Platform Availability Section with Realistic Device Renders */}
        <section
          id="apps"
          className="relative w-full py-16 md:py-20 lg:py-24 border-b border-border/40 overflow-hidden"
          aria-labelledby="apps-heading"
        >
          {/* Subtle ambient lime glow */}
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.06)_0%,transparent_70%)] blur-[44px] pointer-events-none"
          />

          <div className="relative z-10 mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 text-left">
            <div className="max-w-[820px] mb-12">
              <p className="text-[14px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
                Multi-Surface Experience
              </p>
              <h2
                id="apps-heading"
                className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary mb-3"
              >
                One operation. <span className="text-accent">Whichever device you use.</span>
              </h2>
              <p className="text-[16px] md:text-[18px] font-normal leading-[28px] text-muted-foreground">
                The same inventory, permissions, and sync state follow you across every supported iPhone, mobile browser, and desktop web surface.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Card 1: Native iOS App on iPhone */}
              <div className="flex flex-col border border-border/70 rounded-[14px] bg-surface-elevated p-6 text-left transition-all duration-300 hover:border-accent/40 hover:shadow-[0_12px_32px_rgba(204,255,0,0.07)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent font-semibold">
                    Apple iOS
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-mono text-accent">
                    Native App
                  </span>
                </div>
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-2">
                  Native iOS app
                </h3>
                <p className="text-[14px] font-normal leading-[22px] text-muted-foreground mb-6">
                  Fast, one-handed daily work on iPhone with biometrics, camera barcode scanning, and offline interruption recovery.
                </p>
                <div className="mt-auto flex justify-center pt-2">
                  <div className="w-[200px] sm:w-[220px]">
                    <IphoneRender
                      src="/screenshots/iphone-pos-sale.png"
                      alt="DRX Native iOS App on iPhone"
                      badge={{ label: "iOS Native", active: true }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Mobile Web + PWA */}
              <div className="flex flex-col border border-border/70 rounded-[14px] bg-surface-elevated p-6 text-left transition-all duration-300 hover:border-accent/40 hover:shadow-[0_12px_32px_rgba(204,255,0,0.07)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent font-semibold">
                    Mobile Web
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-white/10 border border-white/20 px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                    PWA Ready
                  </span>
                </div>
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-2">
                  Mobile web &amp; PWA
                </h3>
                <p className="text-[14px] font-normal leading-[22px] text-muted-foreground mb-6">
                  Install directly from Safari or Chrome, or work without installation. Full operator tools anywhere you have a mobile browser.
                </p>
                <div className="mt-auto flex justify-center pt-2">
                  <div className="w-[200px] sm:w-[220px]">
                    <IphoneRender
                      src="/screenshots/iphone-dashboard.png"
                      alt="DRX Mobile Web & PWA on iPhone"
                      badge={{ label: "PWA · Sync", active: true }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Desktop Web Interface */}
              <div className="flex flex-col border border-border/70 rounded-[14px] bg-surface-elevated p-6 text-left transition-all duration-300 hover:border-accent/40 hover:shadow-[0_12px_32px_rgba(204,255,0,0.07)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent font-semibold">
                    Desktop Web
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-mono text-accent">
                    Full Suite
                  </span>
                </div>
                <h3 className="font-display text-[22px] font-semibold leading-[28px] tracking-[-0.1px] text-text-primary mb-2">
                  Desktop web interface
                </h3>
                <p className="text-[14px] font-normal leading-[22px] text-muted-foreground mb-6">
                  High-density backroom overview, batch catalog intake, sales reporting, and multi-location tenant governance.
                </p>
                <div className="mt-auto flex justify-center pt-2">
                  <div className="w-full">
                    <BrowserRender
                      src="/screenshots/web-dashboard.png"
                      alt="DRX Desktop Web Interface Dashboard"
                      url="drx.deelrx.com/dashboard"
                      badge={{ label: "Desktop Web", active: true }}
                    />
                  </div>
                </div>
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
          <div className="mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0 flex flex-col gap-14 md:gap-16 lg:gap-20">
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
                  The basics before you start running the shift from your phone.
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
