import Link from "next/link";

import { appWaitlistUrl } from "@/lib/app-links";
import {
  frontsRows,
  heroCustomerRows,
  heroQueueRows,
  heroQueueRowsDone,
  revenueRows,
  stockRows,
} from "./demo-data";
import { DemoCard } from "./demo-primitives";

export function LandingHeroSection() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-8 px-6 pb-20 pt-28 md:grid-cols-2 md:pt-36">
      <div>
        <p className="technical-label text-neon-lime">DEELRX CRM</p>
        <h1 className="headline-text mt-4 text-[clamp(2.6rem,8vw,6rem)] text-white">
          Built for Dispensaries. Period.
        </h1>
        <p className="body-copy mt-6 max-w-3xl text-xl text-text-secondary">
          Track your customers, manage balances, stay on top of inventory, and
          see how your shop&apos;s really doing, all in one system made for
          dispensary operators.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={appWaitlistUrl}
            className="neon-pulse-button inline-flex h-12 items-center px-7 text-sm font-semibold"
          >
            Join Beta Waitlist
          </Link>
        </div>
        <p className="body-copy mt-4 text-sm text-text-secondary">
          Not built for grocery stores. Not built for sales bros. Built for you.
        </p>
      </div>

      <div className="hero-demo-stack relative space-y-4 pt-2">
        <div className="queue-card-wrap">
          <div className="queue-state queue-state-processing">
            <DemoCard data={heroQueueRows} />
          </div>
          <div className="queue-state queue-state-done">
            <DemoCard data={heroQueueRowsDone} />
          </div>
        </div>

        <DemoCard data={heroCustomerRows} className="credit-card-pulse" />

        <div className="glass-effect inventory-card-wrap rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <p className="technical-label text-[10px] text-white/70">LOW STOCK WATCH</p>
            <p className="technical-label text-[10px] text-neon-lime">Inventory</p>
          </div>
          <div className="mt-3 space-y-3">
            {stockRows.map((row, index) => {
              const width = `${Math.min(100, (row.onHand / 20) * 100)}%`;
              return (
                <div key={row.sku} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-white/75">{row.sku}</span>
                    <span className="font-mono text-white">
                      {row.onHand} / R{row.reorder}
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        row.status === "critical"
                          ? "bg-red-400 inventory-bar-tick"
                          : row.status === "warn"
                            ? "bg-amber-300"
                            : "bg-neon-lime"
                      }`}
                      style={{
                        width,
                        animationDelay: `${index * 0.45}s`,
                      }}
                    />
                    <span className="absolute left-[40%] top-0 h-full w-[1px] bg-white/40" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingKeyBentoSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="grid gap-5 md:grid-cols-2">
        <article className="luminosity-card card-lift rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Revenue: Daily Take</h3>
            <span className="technical-label text-[10px] text-neon-lime">SHIFT SUMMARY</span>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {revenueRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-white/60">{row.label}</span>
                <span className="font-mono text-white">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="sparkline-drift mt-4 h-10 w-full rounded-lg bg-gradient-to-r from-neon-lime/15 via-neon-lime/30 to-neon-lime/10" />
          <p className="technical-label mt-3 text-[10px] text-white/50">UPDATED 18:42 LOCAL</p>
        </article>

        <article className="luminosity-card card-lift rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Inventory: Stock Levels</h3>
            <span className="technical-label text-[10px] text-neon-lime">SKU WATCH</span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="grid grid-cols-[1.5fr_1fr_1fr] text-white/60">
              <span>SKU</span>
              <span>On Hand</span>
              <span>Reorder</span>
            </div>
            {stockRows.slice(0, 3).map((row) => (
              <div key={row.sku} className="grid grid-cols-[1.5fr_1fr_1fr] items-center text-white">
                <span className="font-mono text-xs">{row.sku}</span>
                <span className="font-mono">{row.onHand}</span>
                <span className="font-mono">
                  {row.reorder}{" "}
                  {row.status === "warn" ? (
                    <span className="ml-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                      LOW
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="luminosity-card card-lift rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Credit: Fronts</h3>
            <span className="technical-label text-[10px] text-neon-lime">LEDGER PREVIEW</span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] text-white/60">
              <span>Customer</span>
              <span>Due</span>
              <span>Age</span>
              <span>Status</span>
            </div>
            {frontsRows.map((row) => (
              <div key={row.customer} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center text-white">
                <span className="font-mono text-xs">{row.customer}</span>
                <span className="font-mono">{row.due}</span>
                <span className="font-mono">{row.age}</span>
                <span
                  className={`font-mono text-[10px] ${
                    row.status === "OVERDUE"
                      ? "text-red-300"
                      : row.status === "PAID"
                        ? "text-emerald-300"
                        : "text-neon-lime"
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="luminosity-card card-lift rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Security: Who Did What</h3>
            <span className="technical-label text-[10px] text-neon-lime">AUDIT SNAPSHOT</span>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Role</span>
              <span className="font-mono text-white">Manager</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Action</span>
              <span className="font-mono text-white">Inventory Adjustment</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Logged</span>
              <span className="font-mono text-emerald-300">Yes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Event ID</span>
              <span className="audit-ping font-mono text-neon-lime">AUD-77F3A1</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
