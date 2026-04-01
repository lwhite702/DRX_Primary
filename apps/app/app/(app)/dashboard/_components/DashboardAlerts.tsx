import React from "react";
import { Package, AlertCircle } from "lucide-react";
import Link from "next/link";
import { type DashboardStats } from "../_hooks/useDashboardData";

interface DashboardAlertsProps {
  stats: DashboardStats;
}

export function DashboardAlerts({ stats }: DashboardAlertsProps) {
  const hasLowStock = stats.lowStockCount > 0;
  const hasOverdue = stats.overdueCount > 0;

  if (!hasLowStock && !hasOverdue) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-orange-500/15 bg-orange-500/[0.03] p-4 shadow-[0_8px_24px_rgba(249,115,22,0.04)] md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        SECTION C: ALERTS THAT MATTER
      </div>
      <p className="text-xs text-white/70">
        Real exceptions that need action now. Nothing decorative.
      </p>

      <div className="space-y-3">
        {hasLowStock && (
          <div className="bg-[#2A1C00]/40 border border-[#422D00] p-4 rounded-xl flex items-start gap-4">
            <div className="bg-orange-500/20 p-2 rounded-lg text-orange-500 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-orange-500 font-bold text-sm">
                Low Stock Threshold Breached
              </h3>
              <p className="mt-0.5 text-xs text-orange-100/80">
                {stats.lowStockCount} products are below your configured minimum
                stock level. Restock recommended to avoid stockouts.
              </p>
              <Link
                href="/inventory"
                className="inline-block mt-2 text-[10px] font-bold text-[#FFD600] underline decoration-[#FFD600]/30 hover:decoration-[#FFD600]"
              >
                View List
              </Link>
            </div>
          </div>
        )}

        {hasOverdue && (
          <div className="bg-[#2A0505]/40 border border-[#420000] p-4 rounded-xl flex items-start gap-4">
            <div className="bg-red-500/20 p-2 rounded-lg text-red-500 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-red-500 font-bold text-sm">
                Overdue Credit Balances
              </h3>
              <p className="mt-0.5 text-xs text-red-100/80">
                {stats.overdueCount} customers have outstanding balances past
                due date, totaling ${stats.overdueBalance}. Collection action
                may be required.
              </p>
              <Link
                href="/credit"
                className="inline-block mt-2 text-[10px] font-bold text-red-500 underline decoration-red-500/30 hover:decoration-red-500"
              >
                View Accounts
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
