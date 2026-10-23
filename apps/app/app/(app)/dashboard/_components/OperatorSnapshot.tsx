"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
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
        "flex min-h-[144px] min-w-0 flex-col justify-between rounded-xl border border-white/10 bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          <div className="font-display break-words text-2xl font-bold tabular-nums tracking-tight text-foreground md:text-3xl">
            {value}
          </div>
        </div>
        <div className={cn("rounded-md p-1.5", iconClassName)}>{icon}</div>
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">{sublabel}</div>
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
    return Math.round((stats.cashSales / stats.salesToday) * 100);
  }, [stats.cashSales, stats.salesToday]);

  return (
    <section className="rounded-xl border border-accent/15 bg-accent/[0.03] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/75">
            At a glance
          </div>
          <p className="mt-1 text-xs text-white/70">
            Today’s sales, cash tender, and verified stock or credit signals.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
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
            <div className="text-sm font-semibold text-white">{stats.salesToday.toLocaleString("en-US", { style: "currency", currency: "USD" })}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Cash</div>
            <div className="text-sm font-semibold text-white">${stats.cashSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          {stats.lowStockCount !== null ? <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Low Stock</div>
            <div className="text-sm font-semibold text-white">{stats.lowStockCount}</div>
          </div> : null}
          {stats.outstandingBalance !== null ? <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-white/60">Outstanding Credit</div>
            <div className="text-sm font-semibold text-white">${stats.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div> : null}
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
                ${stats.salesToday.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </>
            }
            sublabel={
              <span className="flex items-center justify-between gap-2">
                <span className={cn("inline-flex items-center gap-1 font-semibold", stats.salesGrowth < 0 ? "text-red-400" : "text-success")}>
                  {stats.salesGrowth > 0 ? "+" : ""}{stats.salesGrowth}% {stats.salesGrowth < 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                </span>
                <span className="text-white/65">{stats.transactionsCount} transactions · vs prior 7 days</span>
              </span>
            }
            icon={<TrendingUp className="h-4 w-4" />}
            iconClassName="bg-accent/10 text-accent"
            className="lg:col-span-2"
          />

          <SnapshotCard
            title="Cash Sales"
            value={
              <>
                ${stats.cashSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </>
            }
            sublabel={
              <span>
                {cashSharePercent}% of today&apos;s sales used cash tender
              </span>
            }
            icon={<DollarSign className="h-4 w-4" />}
            iconClassName="bg-success/10 text-success"
            className={compact ? "lg:col-span-1" : undefined}
          />

          <SnapshotCard
            title="Average Sale"
            value={stats.transactionsCount === 0 ? "—" : stats.averageOrderValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            sublabel={<span>{stats.transactionsCount === 0 ? "No completed sales today" : "Average completed sale today"}</span>}
            icon={<TrendingUp className="h-4 w-4" />}
            iconClassName="bg-accent/10 text-accent"
          />

          <SnapshotCard
            title="Tax"
            value={stats.totalTax.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            sublabel={<span>Tax recorded on today’s sales</span>}
            icon={<DollarSign className="h-4 w-4" />}
            iconClassName="bg-warning/10 text-warning"
          />

          <SnapshotCard
            title="Subtotal"
            value={stats.subtotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            sublabel={<span>Before sales tax</span>}
            icon={<DollarSign className="h-4 w-4" />}
            iconClassName="bg-accent/10 text-accent"
          />

          <SnapshotCard
            title="Low Stock"
            value={stats.lowStockCount === null ? "Unavailable" : stats.lowStockCount}
            sublabel={<span>{stats.lowStockCount === null ? "Inventory count could not be verified" : "Products below threshold"}</span>}
            icon={<Package className="h-4 w-4" />}
            iconClassName="bg-warning/10 text-warning"
            className={emphasizeInventory ? "border-warning/20 bg-warning/[0.04]" : undefined}
          />

          <SnapshotCard
            title="Outstanding Credit"
            value={
              stats.outstandingBalance === null || stats.outstandingAccounts === null ? "Unavailable" : <>
                $
                {stats.outstandingBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </>
            }
            sublabel={<span>{stats.outstandingAccounts} customers with active balances</span>}
            icon={<AlertCircle className="h-4 w-4" />}
            iconClassName="bg-red-500/10 text-red-400"
            className={compact ? "md:col-span-2 lg:col-span-2" : undefined}
          />
        </div>
      )}
    </section>
  );
}
