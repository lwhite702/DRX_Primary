import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface CreditStatsProps {
  pendingCount: number;
  delinquentCount: number;
  totalOutstanding: number;
}

export function CreditStats({
  pendingCount,
  delinquentCount,
  totalOutstanding,
}: CreditStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Pending Transactions</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Delinquent Accounts</p>
          <p className="text-2xl font-bold text-destructive">
            {delinquentCount}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
