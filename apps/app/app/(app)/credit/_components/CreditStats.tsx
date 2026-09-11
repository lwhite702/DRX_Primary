import React from "react";
import { formatCount, formatPercentage } from "@/lib/number-format";
import { Card, CardContent } from "@/components/ui/card";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
import { creditMoney } from "./CreditAgingTable";
function sumSafe(values: number[]) { let sum = 0; for (const value of values) { if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - sum) return null; sum += value; } return sum; }
export function CreditStats({ accounts, agingByCustomer, accountsComplete, unavailable = false }: { accounts: CreditAccount[]; agingByCustomer: Record<string, CreditAgingResult>; accountsComplete: boolean; unavailable?: boolean }) {
  const balance = sumSafe(accounts.map(account => account.balanceCents));
  const finite = accounts.filter(account => account.creditEnabled && !account.unlimited);
  const limit = sumSafe(finite.map(account => account.limitCents)), finiteUsed = sumSafe(finite.map(account => account.balanceCents));
  const unlimitedCount = accounts.filter(account => account.creditEnabled && account.unlimited).length;
  const agingKnown = accounts.every(account => agingByCustomer[account.customerId]?.status === "ready");
  const overdueValues = accounts.map(account => { const aging = agingByCustomer[account.customerId]; return aging?.status === "ready" ? sumSafe([aging.bucketsCents["1_7"], aging.bucketsCents["8_14"], aging.bucketsCents["15_30"], aging.bucketsCents["31_plus"]]) : null; });
  const overdue = agingKnown && overdueValues.every(value => value !== null) ? sumSafe(overdueValues as number[]) : null;
  const undated = accounts.some(account => { const aging = agingByCustomer[account.customerId]; return account.allocationStatus === "unreconciled" || (aging?.status === "ready" && (aging.bucketsCents.undated > 0 || aging.bucketsCents.unreconciled > 0)); });
  const totalLabel = accountsComplete ? "All accounts" : "Loaded accounts";
  const amount = (value: number | null) => unavailable ? "Unavailable" : value === null ? "Needs reconciliation" : creditMoney(value);
  return <section aria-label="Credit totals" className="space-y-3">
    <p className="text-sm text-muted-foreground">{totalLabel}: {formatCount(accounts.length)}. {accountsComplete ? "Account list complete." : "Load more accounts for complete totals."}</p>
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Outstanding balance</h2><p className="text-2xl font-mono font-semibold">{amount(balance)}</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Overdue balance</h2><p className="text-2xl font-mono font-semibold">{unavailable ? "Unavailable" : !agingKnown ? "Aging pending" : undated ? "Incomplete aging" : amount(overdue)}</p><p className="text-xs text-muted-foreground">{undated ? "Undated or unreconciled balances need review before the full overdue total is known." : "All overdue buckets, from 1 day onward."}</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Finite credit limits</h2><p className="text-2xl font-mono font-semibold">{amount(limit)}</p><p className="text-xs text-muted-foreground">{formatCount(unlimitedCount)} unlimited {unlimitedCount === 1 ? "account" : "accounts"}; excluded from utilization.</p></CardContent></Card>
    </div>
    <p className="text-sm text-muted-foreground">Finite-account utilization: {unavailable || limit === null || finiteUsed === null ? "Unavailable" : limit === 0 ? "Not applicable" : `${formatPercentage(finiteUsed / limit * 100)}%`}</p>
  </section>;
}
