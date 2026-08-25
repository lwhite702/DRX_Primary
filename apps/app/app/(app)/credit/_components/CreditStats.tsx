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
  onViewOverdue?: () => void;
}

export function CreditStats({
  totalOutstanding = 0,
  customerCount = 0,
  overdueBalance = 0,
  overdueCount = 0,
  totalLimit = 0,
  onViewOverdue,
}: CreditStatsProps) {
  const safeTotalOutstanding = Number(totalOutstanding || 0);
  const safeOverdueBalance = Number(overdueBalance || 0);
  const safeTotalLimit = Number(totalLimit || 0);
  const safeCustomerCount = Number(customerCount || 0);
  const safeOverdueCount = Number(overdueCount || 0);

  const utilization =
    safeTotalLimit > 0 ? (safeTotalOutstanding / safeTotalLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Outstanding */}
        <Card className="bg-card border-border/80">
          <CardContent className="p-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Outstanding
              </p>
              <p className="text-3xl font-bold text-accent font-mono">
                ${safeTotalOutstanding.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Across {safeCustomerCount} customers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Balance */}
        <Card className="bg-card border-border/80">
          <CardContent className="p-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Overdue Balance
              </p>
              <p className="text-3xl font-bold text-destructive font-mono">
                ${safeOverdueBalance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {safeOverdueCount} {safeOverdueCount === 1 ? "customer" : "customers"}{" "}
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
          <p className="text-xs font-bold font-mono text-foreground">
            {utilization.toFixed(1)}%
          </p>
        </div>
        <Progress
          value={utilization}
          className="h-2 bg-muted"
          indicatorClassName="bg-accent"
        />
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
          <span>${safeTotalOutstanding.toFixed(2)} used</span>
          <span>${safeTotalLimit.toFixed(2)} total limit</span>
        </div>
      </div>

      {/* Overdue Alert */}
      {safeOverdueCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-3 items-start">
            <div className="bg-destructive/20 p-2 h-fit rounded-lg text-destructive shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-destructive font-semibold text-sm mb-0.5">
                {safeOverdueCount} Overdue{" "}
                {safeOverdueCount === 1 ? "Account" : "Accounts"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Total overdue: ${safeOverdueBalance.toFixed(2)} • Please review accounts below
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onViewOverdue) {
                onViewOverdue();
              } else {
                document.getElementById("tour-credit-list")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-foreground transition-colors self-start md:self-auto min-h-[44px] px-2"
          >
            <span>View Overdue Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
