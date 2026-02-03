import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ArrowRight } from "lucide-react";

interface CreditStatsProps {
  totalOutstanding: number;
  customerCount: number;
  overdueBalance: number;
  overdueCount: number;
  totalLimit: number;
}

export function CreditStats({
  totalOutstanding,
  customerCount,
  overdueBalance,
  overdueCount,
  totalLimit,
}: CreditStatsProps) {
  const utilization =
    totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Outstanding */}
        <Card className="bg-[#111] border-white/5">
          <CardContent className="p-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Outstanding
              </p>
              <p className="text-3xl font-bold text-[#4ADE80] font-mono">
                ${totalOutstanding.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Across {customerCount} customers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Balance */}
        <Card className="bg-[#111] border-white/5">
          <CardContent className="p-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Overdue Balance
              </p>
              <p className="text-3xl font-bold text-[#EF4444] font-mono">
                ${overdueBalance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {overdueCount} {overdueCount === 1 ? "customer" : "customers"}{" "}
                overdue
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Utilization Bar */}
      <div>
        <div className="flex justify-between items-end mb-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Credit Utilization
          </p>
          <p className="text-xs font-bold font-mono text-white">
            {utilization.toFixed(1)}%
          </p>
        </div>
        <Progress
          value={utilization}
          className="h-2 bg-[#1A1A1A]"
          indicatorClassName="bg-gradient-to-r from-[#4ADE80] to-[#EAB308]"
        />
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
          <span>${totalOutstanding.toFixed(2)} used</span>
          <span>${totalLimit.toFixed(2)} total limit</span>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="bg-[#1A0505] border border-[#EF4444]/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="bg-[#EF4444]/10 p-2 h-fit rounded text-[#EF4444]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[#EF4444] font-bold text-sm mb-1">
                {overdueCount} Overdue{" "}
                {overdueCount === 1 ? "Account" : "Accounts"}
              </h3>
              <p className="text-xs text-[#EF4444]/70">
                Total overdue: ${overdueBalance.toFixed(2)} • Please review
                immediately
              </p>
            </div>
          </div>

          <button className="flex items-center gap-1 text-[10px] font-bold text-[#EF4444] uppercase tracking-wider hover:text-white transition-colors">
            View Overdue Accounts <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
