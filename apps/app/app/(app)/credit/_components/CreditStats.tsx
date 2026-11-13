import React from "react";
import { formatPercentage } from "@/lib/number-format";
import { Card, CardContent } from "@/components/ui/card";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
import { creditMoney } from "./CreditAgingTable";
function sumSafe(values: number[]) { let sum = 0; for (const value of values) { if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - sum) return null; sum += value; } return sum; }
function count(value: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value); }
export function CreditStats({ accounts, agingByCustomer, accountsComplete, unavailable = false }: { accounts: CreditAccount[]; agingByCustomer: Record<string, CreditAgingResult>; accountsComplete: boolean; unavailable?: boolean }) {
  const activeAccounts = accounts.filter(account => account.isActive);
  const inactiveAccounts = accounts.filter(account => !account.isActive);
  // Match the Dashboard's conservative balance rule: any pending or
  // unreconciled allocation makes the tenant balance incomplete.
  const balancesConsistent = accounts.every(account => {
    const aging = agingByCustomer[account.customerId];
    return (account.allocationStatus === "ready" || (account.allocationStatus === "missing" && account.balanceCents === 0)) && !(aging?.status === "ready" && aging.bucketsCents.unreconciled > 0);
  });
  const balance = balancesConsistent ? sumSafe(activeAccounts.map(account => account.balanceCents)) : null;
  const inactiveBalance = balancesConsistent ? sumSafe(inactiveAccounts.map(account => account.balanceCents)) : null;
  const activeBalanceCount = balancesConsistent ? activeAccounts.filter(account => account.balanceCents > 0).length : null;
  const inactiveBalanceCount = balancesConsistent ? inactiveAccounts.filter(account => account.balanceCents > 0).length : null;
  const finite = activeAccounts.filter(account => account.creditEnabled && !account.unlimited);
  const limit = sumSafe(finite.map(account => account.limitCents)), finiteUsed = balancesConsistent ? sumSafe(finite.map(account => account.balanceCents)) : null;
  const unlimitedCount = activeAccounts.filter(account => account.creditEnabled && account.unlimited).length;
  const agingKnown = activeAccounts.every(account => account.balanceCents === 0 || agingByCustomer[account.customerId]?.status === "ready");
  const overdueValues = activeAccounts.map(account => { const aging = agingByCustomer[account.customerId]; return aging?.status === "ready" ? sumSafe([aging.bucketsCents["1_7"], aging.bucketsCents["8_14"], aging.bucketsCents["15_30"], aging.bucketsCents["31_plus"]]) : null; });
  const overdue = agingKnown && overdueValues.every(value => value !== null) ? sumSafe(overdueValues as number[]) : null;
  const undated = !balancesConsistent || activeAccounts.some(account => { const aging = agingByCustomer[account.customerId]; return account.allocationStatus === "unreconciled" || (aging?.status === "ready" && (aging.bucketsCents.undated > 0 || aging.bucketsCents.unreconciled > 0)); });
  const totalLabel = accountsComplete ? "All customer accounts" : "Customers loaded";
  const amount = (value: number | null) => unavailable ? "Unavailable" : value === null ? "Needs review" : creditMoney(value);
  return <section aria-label="Credit totals" className="space-y-3">
    <p className="text-sm text-muted-foreground">{totalLabel}: {count(accounts.length)}. {accountsComplete ? "List complete." : "Amounts below cover loaded customers only. Load more to see full totals."}</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">{accountsComplete ? "Amount owed by active customers" : "Amount owed by loaded active customers"}</h2><p className="text-2xl font-mono font-semibold">{amount(balance)}</p><p className="text-xs text-muted-foreground">{activeBalanceCount === null ? "Balance count needs review." : `${count(activeBalanceCount)} active ${activeBalanceCount === 1 ? "customer owes" : "customers owe"} a balance.`}</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Amount owed by inactive customers</h2><p className="text-2xl font-mono font-semibold">{amount(inactiveBalance)}</p><p className="text-xs text-muted-foreground">{inactiveBalanceCount === null ? "Balance count needs review." : `${count(inactiveBalanceCount)} inactive ${inactiveBalanceCount === 1 ? "customer owes" : "customers owe"} a balance; not included in the dashboard total.`}</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Past-due amount</h2><p className="text-2xl font-mono font-semibold">{unavailable ? "Unavailable" : !agingKnown ? "Still checking" : undated ? "Needs review" : amount(overdue)}</p><p className="text-xs text-muted-foreground">{undated ? "Some due dates or balances need review before this total is complete." : "For active customers with a balance past its due date."}</p></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="text-sm text-muted-foreground">Credit limits for active customers</h2><p className="text-2xl font-mono font-semibold">{amount(limit)}</p><p className="text-xs text-muted-foreground">{count(unlimitedCount)} active {unlimitedCount === 1 ? "customer has" : "customers have"} no set credit limit.</p></CardContent></Card>
    </div>
    <p className="text-sm text-muted-foreground">Share of credit limits currently owed: {unavailable ? "Unavailable" : !balancesConsistent ? "Needs review" : limit === null || finiteUsed === null ? "Unavailable" : limit === 0 ? "Not applicable" : `${formatPercentage(finiteUsed / limit * 100)}%`}</p>
  </section>;
}
