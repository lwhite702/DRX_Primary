import React from "react";
import Link from "next/link";
import {
  Calculator,
  Package,
  CreditCard,
  Settings,
  BarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Shortcuts({ compact = false }: { compact?: boolean }) {
  return (
    <section className="space-y-4 rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-4 shadow-[0_8px_30px_rgba(59,130,246,0.04)] md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        SECTION E: SHORTCUTS TO CORE DOMAINS
      </div>
      <p className="text-xs text-white/70">
        Core domain links for switching context without leaving the dashboard.
      </p>

      <div className={cn("grid gap-4", compact ? "grid-cols-3 md:grid-cols-5" : "grid-cols-2 md:grid-cols-5")}>
        <Link
          href="/pos/sale"
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] transition-all hover:bg-[#111] hover:border-[#4ADE80]/30",
            compact ? "gap-1.5 p-3" : "gap-2 p-4",
          )}
        >
          <div className="text-[#4ADE80] group-hover:scale-110 transition-transform">
            <Calculator className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            Quick Sale
          </span>
        </Link>
        <Link
          href="/inventory"
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] transition-all hover:bg-[#111] hover:border-blue-500/30",
            compact ? "gap-1.5 p-3" : "gap-2 p-4",
          )}
        >
          <div className="text-blue-500 group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Inventory
          </span>
        </Link>
        <Link
          href="/credit"
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] transition-all hover:bg-[#111] hover:border-orange-500/30",
            compact ? "gap-1.5 p-3" : "gap-2 p-4",
          )}
        >
          <div className="text-orange-500 group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Credit
          </span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] transition-all hover:bg-[#111] hover:border-gray-500/30",
            compact ? "gap-1.5 p-3" : "gap-2 p-4",
          )}
        >
          <div className="text-gray-400 group-hover:scale-110 transition-transform">
            <Settings className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Settings
          </span>
        </Link>
        <Link
          href="/reports"
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] transition-all hover:bg-[#111] hover:border-purple-500/30",
            compact ? "gap-1.5 p-3" : "gap-2 p-4",
          )}
        >
          <div className="text-purple-500 group-hover:scale-110 transition-transform">
            <BarChart className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Reports
          </span>
        </Link>
      </div>

      <div className="rounded-lg border border-blue-500/15 bg-blue-500/5 p-3">
        <p className="text-[11px] leading-relaxed text-white/80">
          Shortcut visibility follows your current role permissions. Use the
          pinned panel for personal workflow favorites.
        </p>
      </div>
    </section>
  );
}
