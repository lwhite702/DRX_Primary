import React from "react";
import { formatCount, formatPercentage } from "@/lib/number-format";
import { Card, CardContent } from "@/components/ui/card";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
import { creditMoney } from "./CreditAgingTable";
function sumSafe(values: number[]) { let sum = 0; for (const value of values) { if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - sum) return null; sum += value; } return sum; }
export function CreditStats({ accounts, agingByCustomer, accountsComplete, unavailable = false }: { accounts: CreditAccount[]; agingByCustomer: Record<string, CreditAgingResult>; accountsComplete: boolean; unavailable?: boolean }) {
  const activeAccounts = accounts.filter(account => account.isActive);
  const inactiveAccounts = accounts.filter(account => !account.isActive);
  const balance = sumSafe(activeAccounts.map(account => account.balanceCents));
  const inactiveBalance = sumSafe(inactiveAccounts.map(account => account.balanceCents));
  const activeBalanceCount = activeAccounts.filter(account => account.balanceCents > 0).length;
  const inactiveBalanceCount = inactiveAccounts.filter(account => account.balanceCents > 0).length;
  const finite = activeAccounts.filter(account => account.creditEnabled && !account.unlimited);
  const limit = sumSafe(finite.map(account => account.limitCents)), finiteUsed = sumSafe(finite.map(account => account.balanceCents));
  const unlimitedCount = activeAccounts.filter(account => account.creditEnabled && account.unlimited).length;
  const agingKnown = activeAccounts.every(account => agingByCustomer[account.customerId]?.status === "ready");
  const overdueValues = activeAccounts.map(account => { const aging = agingByCustomer[account.customerId]; return aging?.status === "ready" ? sumSafe([aging.bucketsCents["1_7"], aging.bucketsCents["8_14"], aging.bucketsCents["15_30"], aging.bucketsCents["31_plus"]]) : null; });
  const overdue = agingKnown && overdueValues.every(value => value !== null) ? sumSafe(overdueValues as number[]) : null;
  const undated = activeAccounts.some(account => { const aging = agingByCustomer[account.customerId]; return account.allocationStatus === "unreconciled" || (aging?.status === "ready" && (aging.bucketsCents.undated > 0 || aging.bucketsCents.unreconciled > 0)); });
  const totalLabel = accountsComplete ? "All accounts" : "Loaded accounts";
  const amount = (value: number | null) => unavailable ? "Unavailable" : value === null ? "Needs reconciliation" : creditMoney(value);
  return <section aria-label="Credit totals" className="space-y-3">
    <p className="text-sm text-muted-foreground">{totalLabel}: {formatCount(accounts.length)}. {accountsComplete ? "Account list complete." : "Load more accounts for complete totals."}</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Active outstanding balance</h2><p className="text-2xl font-mono font-semibold">{amount(balance)}</p><p className="text-xs text-muted-foreground">{formatCount(activeBalanceCount)} active {activeBalanceCount === 1 ? "account" : "accounts"} with a balance.</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Inactive outstanding balance</h2><p className="text-2xl font-mono font-semibold">{amount(inactiveBalance)}</p><p className="text-xs text-muted-foreground">{formatCount(inactiveBalanceCount)} inactive {inactiveBalanceCount === 1 ? "account" : "accounts"} with a balance; excluded from the dashboard total.</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Active overdue balance</h2><p className="text-2xl font-mono font-semibold">{unavailable ? "Unavailable" : !agingKnown ? "Aging pending" : undated ? "Incomplete aging" : amount(overdue)}</p><p className="text-xs text-muted-foreground">{undated ? "Undated or unreconciled balances need review before the full overdue total is known." : "Active accounts only; all overdue buckets, from 1 day onward."}</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Active finite credit limits</h2><p className="text-2xl font-mono font-semibold">{amount(limit)}</p><p className="text-xs text-muted-foreground">{formatCount(unlimitedCount)} unlimited active {unlimitedCount === 1 ? "account" : "accounts"}; excluded from utilization.</p></CardContent></Card>
    </div>
    <p className="text-sm text-muted-foreground">Active finite-account utilization: {unavailable || limit === null || finiteUsed === null ? "Unavailable" : limit === 0 ? "Not applicable" : `${formatPercentage(finiteUsed / limit * 100)}%`}</p>
  </section>;
}
