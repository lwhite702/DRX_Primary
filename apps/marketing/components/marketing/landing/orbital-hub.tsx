import type { CSSProperties } from "react";

import { cn } from "@deelrx/ui";
import {
  cyberMetrics,
  cyberRingConfig,
} from "@/components/marketing/landing/cyber-data";

export function OrbitalHub() {
  return (
    <section id="system" className="mx-auto w-full max-w-6xl px-6 pb-20">
      <div className="grid items-center gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="technical-label text-neon-lime">System Coverage</p>
          <h2 className="mt-4 font-sans text-[clamp(2rem,5vw,3.6rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em] text-white">
            One Surface. Full Daily Visibility.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/72">
            DRX brings sales, inventory, customer records, and team controls into one
            connected view so you can move quickly without losing accuracy.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/62">
            The orbit map reflects active modules and operator actions connected to DRX core.
          </p>

          <div className="mt-8 grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] sm:grid-cols-4">
            {cyberMetrics.map((metric) => (
              <div key={metric.label} className="px-4 py-5 text-center first:pl-5">
                <p className="font-sans text-3xl font-bold text-white">{metric.value}</p>
                <p className="technical-label mt-2 text-[10px] text-neon-lime">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto h-[420px] w-[420px] max-w-full sm:h-[540px] sm:w-[540px] lg:col-span-7 lg:h-[760px] lg:w-[760px]">
          <div
            className="pointer-events-none absolute inset-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-lime/10 blur-[90px]"
            aria-hidden
          />

          {cyberRingConfig.map((ring) => {
            const ringStyle: CSSProperties = {
              width: `${ring.radius * 2}px`,
              height: `${ring.radius * 2}px`,
              animationDuration: `${ring.durationSeconds}s`,
              animationDirection: ring.reverse ? "reverse" : "normal",
            };

            return (
              <div
                key={ring.id}
                className="cyber-orbit-spin absolute left-1/2 top-1/2"
                style={{
                  ...ringStyle,
                  transform: "translate(-50%, -50%)",
                }}
                aria-hidden
              >
                <div className="absolute inset-0 rounded-full border border-neon-lime/10" />

                {ring.nodes.map((node, index) => {
                  const angle = (360 / ring.nodes.length) * index;
                  const Icon = node.icon;

                  return (
                    <div
                      key={node.id}
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${ring.radius}px)`,
                      }}
                    >
                      <div style={{ transform: `rotate(-${angle}deg)` }} title={node.label}>
                      <div
                        className={cn(
                          "cyber-float flex items-center justify-center rounded-full",
                          ring.nodeSizeClassName,
                        )}
                        style={{ animationDelay: `${index * 0.14}s` }}
                      >
                        <div
                          className={cn(
                            "cyber-orbit-counter flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-black/65 text-neon-lime shadow-[0_0_18px_rgba(204,255,0,0.15)]",
                          )}
                          style={{
                            animationDuration: `${ring.durationSeconds}s`,
                            animationDirection: ring.reverse ? "normal" : "reverse",
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neon-lime/30 bg-neon-lime/15 backdrop-blur-[16px]">
            <div className="flex h-full items-center justify-center rounded-full border border-white/10 bg-black/45">
              <div className="text-center">
                <p className="technical-label text-[10px] text-neon-lime">DRX CORE</p>
                <p className="mt-2 text-sm font-semibold text-white/80">SYSTEM LIVE</p>
              </div>
            </div>
          </div>

          <div className="absolute right-[3%] top-[12%] rounded-full border border-neon-lime/30 bg-neon-lime/10 px-4 py-2 text-sm font-semibold text-neon-lime shadow-[0_0_25px_rgba(204,255,0,0.25)] animate-pulse">
            +800
          </div>
        </div>
      </div>
    </section>
  );
}
