"use client";
import React from "react";
import { formatPercentage } from "@/lib/number-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
import { CreditAgingTable, creditMoney } from "./CreditAgingTable";
interface Props {
  account: CreditAccount; aging?: CreditAgingResult; busy?: boolean;
  onRecordPayment: (id: string) => void; onAddBalance: (id: string) => void; onViewHistory: (id: string) => void; onRefreshAllocation: (id: string) => void;
}
export function CreditCustomerCard({ account, aging, busy, onRecordPayment, onAddBalance, onViewHistory, onRefreshAllocation }: Props) {
  const ready = aging?.status === "ready" ? aging : undefined;
  const overdue = ready ? ready.bucketsCents["1_7"] + ready.bucketsCents["8_14"] + ready.bucketsCents["15_30"] + ready.bucketsCents["31_plus"] : undefined;
  const needsReconciliation = account.allocationStatus === "unreconciled" || (ready && ready.bucketsCents.unreconciled > 0);
  const status = account.allocationStatus === "unreconciled" ? "Balance needs review" : account.allocationStatus === "pending" || account.allocationStatus === "missing" ? "Balance is being checked" : needsReconciliation ? "Due amounts need review" : !ready ? "Due dates are being checked" : overdue! > 0 ? "Past due" : ready.bucketsCents.undated > 0 ? "Some due dates are missing" : "No amount is past due";
  const balanceConfirmed = account.allocationStatus === "ready" && ready !== undefined && !needsReconciliation;
  return <Card role="article" aria-label={account.displayName}><CardContent className="space-y-4 p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{account.displayName}</h3><p className="text-sm text-muted-foreground">{status}{!account.isActive ? " · Inactive" : ""}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Amount owed</p><p className="font-mono text-xl font-semibold">{balanceConfirmed ? creditMoney(account.balanceCents) : "Needs review"}</p></div></div>
    <div className="flex flex-wrap gap-4 text-sm"><p>{!account.creditEnabled ? "Credit is off" : account.unlimited ? "No set credit limit" : `Credit limit: ${creditMoney(account.limitCents)}`}</p>
      {balanceConfirmed && account.creditEnabled && !account.unlimited && account.limitCents > 0 && <p>Available credit: {creditMoney(Math.max(0, account.limitCents - account.balanceCents))} ({formatPercentage(account.balanceCents / account.limitCents * 100)}% used)</p>}
      <p>{ready ? ready.lastPaymentAt === undefined ? "No payment recorded yet" : `Last payment: ${new Date(ready.lastPaymentAt).toLocaleDateString()}` : "Payment history is still loading"}</p>
    </div>
    <CreditAgingTable aging={aging} />
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => onRecordPayment(account.customerId)} disabled={busy || !account.isActive || !balanceConfirmed || account.balanceCents === 0}>Record a payment</Button>
      <Button variant="outline" onClick={() => onAddBalance(account.customerId)} disabled={busy || !account.isActive || !account.creditEnabled}>Add to a balance</Button>
      <Button variant="ghost" onClick={() => onViewHistory(account.customerId)}>View payment history</Button>
      {(!ready || needsReconciliation) && <Button variant="ghost" disabled={busy} onClick={() => onRefreshAllocation(account.customerId)}>Check balance again</Button>}
    </div>
  </CardContent></Card>;
}
