/**
 * Brand-built vector artwork for the marketing hero. It uses the current DRX
 * navigation and workflow terms without presenting invented records or totals
 * as real product data.
 */
export function MarketingProductProof() {
  return (
    <figure
      className="drx-hero-art relative w-full min-w-0 max-w-[640px]"
      aria-label="Illustrated DRX workspace with sales, products, and customer tools"
    >
      <div aria-hidden="true" className="drx-hero-art__orbit" />
      <div aria-hidden="true" className="drx-hero-art__spark drx-hero-art__spark--one" />
      <div aria-hidden="true" className="drx-hero-art__spark drx-hero-art__spark--two" />

      <div className="drx-app-window relative overflow-hidden rounded-[22px] border border-white/10 bg-[#111313] shadow-[0_28px_90px_rgba(0,0,0,0.58)]">
        <div className="flex h-12 items-center justify-between border-b border-white/[0.07] bg-[#151717] px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-black">
              <Image src="/brand/drx-mark.svg" width={20} height={20} alt="" className="size-4 object-contain" />
            </span>
            <span className="text-[12px] font-semibold tracking-wide text-white/90">DRX</span>
          </div>
          <span className="hidden rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-medium text-white/55 sm:inline-flex">
            Workspace
          </span>
          <span className="size-2 rounded-full bg-[#4ad6ff] shadow-[0_0_12px_rgba(74,214,255,.6)]" />
        </div>

        <div className="grid min-h-[350px] grid-cols-[50px_1fr] sm:min-h-[408px] sm:grid-cols-[158px_1fr]">
          <aside className="border-r border-white/[0.07] bg-[#131515] p-2.5 sm:p-4">
            <div className="mb-5 hidden text-[9px] font-medium uppercase tracking-[.14em] text-white/30 sm:block">Workspace</div>
            <div className="space-y-2.5">
              {[
                { label: "Home", color: "bg-accent" },
                { label: "New sale", color: "bg-[#4ad6ff]" },
                { label: "Products", color: "bg-[#ff806b]" },
                { label: "Customers", color: "bg-[#9c8cff]" },
                { label: "Reports", color: "bg-[#58d6a0]" },
              ].map((item, index) => (
                <div key={item.label} className={`flex h-8 items-center gap-2 rounded-lg px-2 ${index === 0 ? "bg-white/[0.08]" : ""}`}>
                  <span className={`size-1.5 shrink-0 rounded-sm ${item.color}`} />
                  <span className={`hidden truncate text-[10px] sm:block ${index === 0 ? "font-medium text-white/85" : "text-white/42"}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-7 hidden border-t border-white/[0.07] pt-4 sm:block">
              <div className="mb-3 text-[9px] uppercase tracking-[.14em] text-white/25">Team</div>
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-gradient-to-br from-[#9c8cff] to-[#4ad6ff]" />
                <span className="text-[9px] text-white/50">Business</span>
              </div>
            </div>
          </aside>

          <div className="min-w-0 p-3.5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-[.16em] text-white/35">Home</div>
                <div className="mt-1 text-[18px] font-semibold tracking-tight text-white sm:text-[22px]">Your business, at a glance.</div>
              </div>
              <div className="hidden h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 text-[9px] text-white/50 sm:flex">
                <span className="size-1.5 rounded-full bg-accent" /> This week
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { title: "Sales", tint: "text-accent", mark: "↗" },
                { title: "Payments", tint: "text-[#4ad6ff]", mark: "↗" },
                { title: "Products", tint: "text-[#ff806b]", mark: "•" },
              ].map((item) => (
                <div key={item.title} className="min-w-0 rounded-xl border border-white/[0.08] bg-[#191c1c] p-2.5 sm:p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[9px] text-white/45 sm:text-[10px]">{item.title}</span>
                    <span className={`text-[13px] font-semibold sm:text-[15px] ${item.tint}`}>{item.mark}</span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]"><div className={`h-full w-2/3 rounded-full ${item.title === "Sales" ? "bg-accent" : item.title === "Payments" ? "bg-[#4ad6ff]" : "bg-[#ff806b]"}`} /></div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-xl border border-white/[0.08] bg-[#191c1c] p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-white/75 sm:text-[11px]">Sales activity</span>
                  <span className="text-[9px] text-white/35">View reports ↗</span>
                </div>
                <div className="mt-5 flex h-[98px] items-end gap-2 border-b border-white/[0.08] px-1 sm:h-[130px] sm:gap-3">
                  {[32, 48, 39, 66, 51, 80, 59, 72, 45, 88, 61, 76].map((height, index) => (
                    <span key={index} className={`flex-1 rounded-t-[3px] ${index === 9 ? "bg-accent" : index % 3 === 1 ? "bg-[#4ad6ff]/75" : "bg-white/15"}`} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex justify-between px-1 text-[8px] text-white/30"><span>Earlier</span><span>Now</span></div>
              </div>

              <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#4ad6ff]/20 bg-[linear-gradient(145deg,rgba(74,214,255,.12),rgba(156,140,255,.07)_52%,rgba(25,28,28,1)_100%)] p-3.5 sm:p-4">
                <div>
                  <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#4ad6ff]/15 text-[#4ad6ff]">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M4 5h16v14H4zM8 9h8M8 13h5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="mt-3 text-[12px] font-semibold text-white/90">New sale</div>
                  <p className="mt-1 text-[9px] leading-4 text-white/45">Find products, review the sale, and record payment.</p>
                </div>
                <div className="mt-4 flex h-8 items-center justify-center rounded-lg bg-accent text-[9px] font-semibold text-black">Start a sale <span className="ml-1">↗</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

export type WorkflowVisualKind = "checkout" | "inventory" | "customers";

export function WorkflowVisual({ kind }: { kind: WorkflowVisualKind }) {
  const visual = {
    checkout: { wash: "from-[#4ad6ff]/20 via-[#9c8cff]/10", accent: "bg-[#4ad6ff]", tint: "bg-[#4ad6ff]/15", label: "New sale", detail: "Review sale" },
    inventory: { wash: "from-[#ff806b]/20 via-[#ffb066]/10", accent: "bg-[#ff806b]", tint: "bg-[#ff806b]/15", label: "Products", detail: "Update count" },
    customers: { wash: "from-accent/20 via-[#58d6a0]/10", accent: "bg-accent", tint: "bg-accent/15", label: "Customers", detail: "Record payment" },
  }[kind];

  return (
    <div aria-hidden="true" className={`relative mb-5 flex h-[116px] items-end overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br ${visual.wash} to-[#141717] p-3`}>
      <div className="absolute -right-4 -top-10 size-28 rounded-full border border-white/[0.08]" />
      <div className="absolute right-7 top-3 size-16 rounded-full border border-white/[0.1]" />
      <div className="relative w-full rounded-lg border border-white/[0.09] bg-[#111313]/85 p-3 shadow-[0_8px_24px_rgba(0,0,0,.22)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-white/75">{visual.label}</span>
          <span className={`size-1.5 rounded-full ${visual.accent}`} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`size-5 rounded-md ${visual.tint}`}>
            <span className={`m-[7px] block size-1.5 rounded-[2px] ${visual.accent}`} />
          </span>
          <span className="h-1.5 w-2/5 rounded-full bg-white/15" />
          <span className="ml-auto h-1.5 w-1/5 rounded-full bg-white/10" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="size-5 rounded-md bg-white/[0.06]" />
          <span className="h-1.5 w-1/3 rounded-full bg-white/10" />
          <span className="ml-auto rounded-full bg-white/[0.07] px-2 py-1 text-[8px] text-white/45">{visual.detail}</span>
        </div>
      </div>
    </div>
  );
}
import Image from "next/image";
