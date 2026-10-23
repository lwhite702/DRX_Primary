import React from "react";
import { Package, AlertCircle } from "lucide-react";
import Link from "next/link";
import { type DashboardStats } from "../_hooks/useDashboardData";

interface DashboardAlertsProps {
  stats: DashboardStats;
}

export function DashboardAlerts({ stats }: DashboardAlertsProps) {
  const hasLowStock = stats.lowStockCount !== null && stats.lowStockCount > 0;
  const hasOutstanding = stats.outstandingAccounts !== null && stats.outstandingAccounts > 0;

  if (!hasLowStock && !hasOutstanding) return null;

  return (
    <section className="space-y-4 rounded-xl border border-warning/15 bg-warning/[0.03] p-4 md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
        Needs attention
      </div>
      <p className="text-xs text-white/70">
        Inventory thresholds and open customer credit balances for this business.
      </p>

      <div className="space-y-3">
        {hasLowStock && (
          <div className="flex items-start gap-4 rounded-lg border border-warning/20 bg-warning/5 p-4">
            <div className="shrink-0 rounded-md bg-warning/20 p-2 text-warning">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warning">
                Low Stock Threshold Breached
              </h3>
              <p className="mt-0.5 text-xs text-white/70">
                {stats.lowStockCount} products are below your configured minimum
                stock level. Restock recommended to avoid stockouts.
              </p>
              <Link
                href="/inventory"
                className="mt-2 inline-block text-[10px] font-bold text-warning underline decoration-warning/30 hover:decoration-warning"
              >
                View List
              </Link>
            </div>
          </div>
        )}

        {hasOutstanding && (
          <div className="flex items-start gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="shrink-0 rounded-md bg-destructive/20 p-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">
                Outstanding Credit Balances
              </h3>
              <p className="mt-0.5 text-xs text-white/70">
                {stats.outstandingAccounts} customers have active balances,
                totaling ${stats.outstandingBalance?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "unavailable"}. Review the accounts if
                follow-up is needed.
              </p>
              <Link
                href="/credit"
                className="mt-2 inline-block text-[10px] font-bold text-destructive underline decoration-destructive/30 hover:decoration-destructive"
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
