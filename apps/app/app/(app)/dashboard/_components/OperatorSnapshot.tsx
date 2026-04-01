"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type DashboardStats } from "../_hooks/useDashboardData";
import { DASHBOARD_SNAPSHOT_COLLAPSED_KEY } from "@/lib/auth/dashboard-preferences";
import { cn } from "@/lib/utils";

interface OperatorSnapshotProps {
  stats: DashboardStats;
  compact?: boolean;
  emphasizeInventory?: boolean;
}

function SnapshotCard({
  title,
  value,
  sublabel,
  icon,
  iconClassName,
  className,
}: {
  title: string;
  value: React.ReactNode;
  sublabel: React.ReactNode;
  icon: React.ReactNode;
  iconClassName: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[132px] flex-col justify-between rounded-xl border border-white/10 bg-[#0B0B0C] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {title}
          </h3>
          <div className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            {value}
          </div>
        </div>
        <div className={cn("rounded-md p-1.5", iconClassName)}>{icon}</div>
      </div>
      <div className="text-[11px] text-white/70">{sublabel}</div>
    </div>
  );
}

export function OperatorSnapshot({
  stats,
  compact = false,
  emphasizeInventory = false,
}: OperatorSnapshotProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DASHBOARD_SNAPSHOT_COLLAPSED_KEY);
      setCollapsed(raw === "true");
    } catch {
      setCollapsed(false);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(DASHBOARD_SNAPSHOT_COLLAPSED_KEY, String(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  const cashSharePercent = useMemo(() => {
    if (stats.salesToday <= 0) return 0;
    return Math.round((stats.cashCollected / stats.salesToday) * 100);
  }, [stats.cashCollected, stats.salesToday]);

  return (
    <section className="rounded-2xl border border-[#4ADE80]/15 bg-[#4ADE80]/[0.03] p-4 shadow-[0_10px_30px_rgba(74,222,128,0.04)] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
            SECTION A: OPERATOR SNAPSHOT
          </div>
          <p className="mt-1 text-xs text-white/70">
            Daily totals, credit exposure, and stock pressure at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
          aria-expanded={!collapsed}
          aria-controls="operator-snapshot-content"
        >
          {collapsed ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Expand
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>
      </div>

      {collapsed ? (
        <div
          id="operator-snapshot-content"
          className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"
        >
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Sales</div>
            <div className="text-sm font-semibold text-white">${stats.salesToday.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Cash</div>
            <div className="text-sm font-semibold text-white">${stats.cashCollected.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Low Stock</div>
            <div className="text-sm font-semibold text-white">{stats.lowStockCount}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Overdue</div>
            <div className="text-sm font-semibold text-white">${stats.overdueBalance.toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <div
          id="operator-snapshot-content"
          className={cn(
            "mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
            compact && "xl:grid-cols-2",
          )}
        >
          <SnapshotCard
            title="Sales Today"
            value={
              <>
                ${stats.salesToday.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </>
            }
            sublabel={
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-[#4ADE80]">
                  +{stats.salesGrowth}% <ArrowUpRight className="h-3 w-3" />
                </span>
                <span className="text-white/65">{stats.transactionsCount} transactions</span>
              </span>
            }
            icon={<TrendingUp className="h-4 w-4" />}
            iconClassName="bg-[#4ADE80]/10 text-[#4ADE80]"
            className="lg:col-span-2"
          />

          <SnapshotCard
            title="Cash Collected"
            value={
              <>
                ${stats.cashCollected.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </>
            }
            sublabel={
              <span>
                {cashSharePercent}% of today&apos;s sales collected in cash
              </span>
            }
            icon={<DollarSign className="h-4 w-4" />}
            iconClassName="bg-[#4ADE80]/10 text-[#4ADE80]"
            className={compact ? "lg:col-span-1" : undefined}
          />

          <SnapshotCard
            title="Low Stock"
            value={stats.lowStockCount}
            sublabel={<span>Products below threshold</span>}
            icon={<Package className="h-4 w-4" />}
            iconClassName="bg-orange-500/10 text-orange-400"
            className={emphasizeInventory ? "border-orange-500/20 bg-orange-500/[0.04]" : undefined}
          />

          <SnapshotCard
            title="Overdue Balance"
            value={
              <>
                $
                {stats.overdueBalance.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </>
            }
            sublabel={<span>{stats.overdueCount} customers with active balances</span>}
            icon={<AlertCircle className="h-4 w-4" />}
            iconClassName="bg-red-500/10 text-red-400"
            className={compact ? "md:col-span-2 lg:col-span-2" : undefined}
          />
        </div>
      )}
    </section>
  );
}

