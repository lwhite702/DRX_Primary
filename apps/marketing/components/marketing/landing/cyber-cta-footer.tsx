import Link from "next/link";

import { appWaitlistUrl } from "@/lib/app-links";
import { cyberFooterColumns } from "@/components/marketing/landing/cyber-data";

export function CyberCtaFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#0a0a0a] pb-10 pt-20">
      <div
        className="pointer-events-none absolute left-1/2 top-[54%] -translate-x-1/2 select-none text-center font-sans text-[15vw] font-bold uppercase leading-none text-white/[0.03]"
        aria-hidden
      >
        Deelrx CRM
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-[16px] md:p-10">
          <p className="technical-label text-neon-lime">System Ready</p>
          <h2 className="mt-4 max-w-4xl font-sans text-[clamp(2.4rem,9vw,6.2rem)] font-bold uppercase leading-[0.95] tracking-[-0.035em] text-white">
            Put DRX On Your Counter.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/72">
            Start beta access and run checkout, inventory, and customer records from one clean workspace.
          </p>
          <Link
            href={appWaitlistUrl}
            className="neon-pulse-button mt-8 inline-flex rounded-full bg-neon-lime px-10 py-4 text-base font-bold uppercase tracking-wide text-black"
          >
            Start In Beta
          </Link>
        </div>

        <div className="mt-14 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <p className="technical-label text-[10px] text-neon-lime">DEELRX CRM</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/68">
              Built for operators who need speed, clear counts, and dependable records.
            </p>
          </div>

          {cyberFooterColumns.map((column) => (
            <div key={column.title}>
              <p className="technical-label text-[10px] text-white/60">{column.title}</p>
              <div className="mt-3 space-y-2">
                {column.links.map((link) => {
                  const isExternal = link.href.startsWith("http");
                  return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="block text-sm text-white/70 transition-colors hover:text-neon-lime"
                  >
                    {link.label}
                  </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[11px]">
          <span className="technical-label text-[10px] text-white/45">© 2026 DRX · Wrelik Brands LLC</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="technical-label rounded-full border border-neon-lime/30 bg-neon-lime/10 px-2.5 py-1 text-[9px] text-neon-lime">
              PRIVACY CONTROLS ON
            </span>
            <span className="technical-label rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[9px] text-white/60">
              AUDIT LOGS ACTIVE
            </span>
            <span className="technical-label rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[9px] text-white/60">
              FLOOR STATUS LIVE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
