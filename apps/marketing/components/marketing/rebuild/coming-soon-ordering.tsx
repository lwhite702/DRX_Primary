import Link from "next/link";
import {
  ArrowRight,
  Clock,
  ClipboardList,
  Lock,
  SlidersHorizontal,
  Sparkles,
  Store,
} from "lucide-react";
import { appWaitlistUrl } from "@/lib/app-links";

export function ComingSoonOrdering() {
  return (
    <section
      id="customer-ordering"
      className="relative w-full py-16 md:py-20 lg:py-24 bg-surface border-b border-border/40 overflow-hidden"
      aria-labelledby="ordering-heading"
    >
      {/* Background Subtle Gradient */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.06)_0%,transparent_70%)] blur-[50px] pointer-events-none" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-5 md:px-12 lg:px-0">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 lg:mb-16 text-left">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[12px] font-mono font-medium text-accent mb-3">
              <Sparkles className="size-3.5 text-accent" />
              <span>Coming soon · Teaser</span>
            </div>
            <h2
              id="ordering-heading"
              className="font-display text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[36px] md:leading-[42px] lg:leading-[48px] tracking-[-0.5px] text-text-primary mb-3"
            >
              Customer ordering.{" "}
              <span className="text-accent">Direct from your catalog.</span>
            </h2>
            <p className="text-[16px] md:text-[18px] font-normal leading-[26px] md:leading-[28px] text-muted-foreground">
              A clean menu link for your verified customers to request items directly,
              sync counts automatically, and eliminate missed texts.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href={appWaitlistUrl}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-accent px-5 text-[14px] font-semibold text-black hover:opacity-95 hover:shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Join early access</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Feature Grid & Visual Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Coming soon capabilities */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            {/* Capability 1 */}
            <div className="group rounded-[12px] border border-border bg-surface-elevated p-5 md:p-6 transition-all duration-200 hover:border-accent/40">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent mt-0.5">
                  <Store className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-[18px] md:text-[20px] font-semibold text-text-primary mb-1">
                    Your live shop menu
                  </h3>
                  <p className="text-[14px] md:text-[15px] leading-[22px] text-muted-foreground">
                    A private, branded link showing only what’s currently in stock with clear counts and prices.
                  </p>
                </div>
              </div>
            </div>

            {/* Capability 2 */}
            <div className="group rounded-[12px] border border-border bg-surface-elevated p-5 md:p-6 transition-all duration-200 hover:border-accent/40">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent mt-0.5">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-[18px] md:text-[20px] font-semibold text-text-primary mb-1">
                    Direct order requests
                  </h3>
                  <p className="text-[14px] md:text-[15px] leading-[22px] text-muted-foreground">
                    Customers pick what they want in seconds. Requests land directly in your DRX workspace.
                  </p>
                </div>
              </div>
            </div>

            {/* Capability 3 */}
            <div className="group rounded-[12px] border border-border bg-surface-elevated p-5 md:p-6 transition-all duration-200 hover:border-accent/40">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent mt-0.5">
                  <SlidersHorizontal className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-[18px] md:text-[20px] font-semibold text-text-primary mb-1">
                    Shop controls
                  </h3>
                  <p className="text-[14px] md:text-[15px] leading-[22px] text-muted-foreground">
                    You choose which items are visible, set order minimums, and decide who gets access.
                  </p>
                </div>
              </div>
            </div>

            {/* Capability 4 */}
            <div className="group rounded-[12px] border border-border bg-surface-elevated p-5 md:p-6 transition-all duration-200 hover:border-accent/40">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent mt-0.5">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-[18px] md:text-[20px] font-semibold text-text-primary mb-1">
                    Instant fulfillment queue
                  </h3>
                  <p className="text-[14px] md:text-[15px] leading-[22px] text-muted-foreground">
                    Confirm the order, pack the items, and record payment when handed off. No double selling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Illustrative concept preview */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[340px] rounded-[24px] border border-border/80 bg-[#0c0c0c] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-left">
              {/* Browser-style concept frame */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-500/80" />
                  <span className="size-2 rounded-full bg-yellow-500/80" />
                  <span className="size-2 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-mono text-[#a3a3a3]">
                  <Lock className="size-2.5 text-accent" />
                  <span>Preview</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Coming soon</span>
              </div>

              {/* Static preview */}
              <div className="space-y-3">
                {/* Shop page concept */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-[13px] text-text-primary">
                      Sample shop
                    </span>
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono font-medium text-accent">
                      Live link
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Customer menu · Direct access
                  </p>
                </div>

                {/* Page elements */}
                <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3 text-[12px]">
                  <div className="flex items-center justify-between text-text-primary">
                    <span>Live product catalog</span>
                    <span className="font-mono text-accent">Real-time</span>
                  </div>
                  <div className="flex items-center justify-between text-text-primary">
                    <span>Order request queue</span>
                    <span className="font-mono text-accent">Instant</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between font-medium">
                    <span className="text-muted-foreground">Inventory sync</span>
                    <span className="font-mono text-accent font-bold text-[13px]">Automatic</span>
                  </div>
                </div>

                {/* Status callout */}
                <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-accent text-[11px] font-medium">
                    <Clock className="size-3.5" />
                    <span>In development for beta shops</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Early beta partners will test customer ordering first before general rollout.
                  </p>
                </div>

                {/* Concept status */}
                <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                  <span>Customer menu experience</span>
                  <span className="font-mono text-accent">● Coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
