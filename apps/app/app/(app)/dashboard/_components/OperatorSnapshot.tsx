import React from "react";
import { type DashboardStats } from "../_hooks/useDashboardData";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";

interface OperatorSnapshotProps {
  stats: DashboardStats;
}

export function OperatorSnapshot({ stats }: OperatorSnapshotProps) {
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        SECTION A: OPERATOR SNAPSHOT
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-xl flex flex-col justify-between h-[130px] relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Sales Today
              </h3>
              <div className="text-3xl font-bold text-white tracking-tight">
                $
                {stats.salesToday.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
            <div className="text-[#4ADE80] bg-[#4ADE80]/10 p-1.5 rounded-md">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] flex items-center gap-2 mt-auto">
            <span className="text-[#4ADE80] font-bold flex items-center gap-0.5">
              +{stats.salesGrowth}% <ArrowUpRight className="w-3 h-3" />
            </span>
            <span className="text-muted-foreground ml-auto">
              {stats.transactionsCount} transactions
            </span>
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-xl flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Cash Collected
              </h3>
              <div className="text-3xl font-bold text-white tracking-tight">
                $
                {stats.cashCollected.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
            <div className="text-[#4ADE80] bg-[#4ADE80]/10 p-1.5 rounded-md">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-auto">
            74% of sales
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-xl flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Low Stock
              </h3>
              <div className="text-3xl font-bold text-white tracking-tight">
                {stats.lowStockCount}
              </div>
            </div>
            <div className="text-orange-500 bg-orange-500/10 p-1.5 rounded-md">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-auto">
            Products below threshold
          </div>
        </div>

        {/* Overdue Balance */}
        <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-xl flex flex-col justify-between h-[130px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Overdue Balance
              </h3>
              <div className="text-3xl font-bold text-white tracking-tight">
                $
                {stats.overdueBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
            <div className="text-red-500 bg-red-500/10 p-1.5 rounded-md">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-auto">
            {stats.overdueCount} customers
          </div>
        </div>
      </div>
    </div>
  );
}
