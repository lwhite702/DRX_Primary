import React from "react";
import Link from "next/link";
import {
  Calculator,
  Package,
  CreditCard,
  Settings,
  BarChart,
} from "lucide-react";

export function Shortcuts() {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        SECTION E: SHORTCUTS TO CORE DOMAINS
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Link
          href="/manual-sale"
          className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#111] hover:border-[#4ADE80]/30 transition-all group"
        >
          <div className="text-[#4ADE80] group-hover:scale-110 transition-transform">
            <Calculator className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            POS
          </span>
        </Link>
        <Link
          href="/inventory"
          className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#111] hover:border-blue-500/30 transition-all group"
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
          className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#111] hover:border-orange-500/30 transition-all group"
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
          className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#111] hover:border-gray-500/30 transition-all group"
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
          className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#111] hover:border-purple-500/30 transition-all group"
        >
          <div className="text-purple-500 group-hover:scale-110 transition-transform">
            <BarChart className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Reports
          </span>
        </Link>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-blue-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
          PRIVACY PRESET: BALANCED
        </div>
        <p className="text-[10px] text-muted-foreground">
          Customer linked counts are visible in your role. Normal operations
          with guardrails. Role-limited exports. All activity is logged and
          audited.
        </p>
      </div>
    </div>
  );
}
