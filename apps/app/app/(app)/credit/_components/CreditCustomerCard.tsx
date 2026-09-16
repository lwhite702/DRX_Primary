"use client";
import React from "react";
import { formatPercentage } from "@/lib/number-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
import { CreditAgingTable, creditMoney } from "./CreditAgingTable";
interface Props {
  account: CreditAccount; aging?: CreditAgingResult; busy?: boolean;
  onRecordPayment: (id: string) => void; onViewHistory: (id: string) => void; onRefreshAllocation: (id: string) => void;
}
export function CreditCustomerCard({ account, aging, busy, onRecordPayment, onViewHistory, onRefreshAllocation }: Props) {
  const ready = aging?.status === "ready" ? aging : undefined;
  const overdue = ready ? ready.bucketsCents["1_7"] + ready.bucketsCents["8_14"] + ready.bucketsCents["15_30"] + ready.bucketsCents["31_plus"] : undefined;
  const needsReconciliation = account.allocationStatus === "unreconciled" || (ready && ready.bucketsCents.unreconciled > 0);
  const status = needsReconciliation ? "Needs reconciliation" : !ready ? "Aging pending" : overdue! > 0 ? "Overdue" : ready.bucketsCents.undated > 0 ? "Due dates incomplete" : "Current";
  return <Card role="article" aria-label={account.displayName}><CardContent className="space-y-4 p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{account.displayName}</h3><p className="text-sm text-muted-foreground">{status}{!account.isActive ? " · Inactive account" : ""}</p></div><p className="font-mono text-xl font-semibold">{creditMoney(account.balanceCents)}</p></div>
    <div className="flex flex-wrap gap-4 text-sm"><p>{!account.creditEnabled ? "Credit disabled" : account.unlimited ? "Unlimited credit" : `Credit limit: ${creditMoney(account.limitCents)}`}</p>
      {account.creditEnabled && !account.unlimited && account.limitCents > 0 && <p>Utilization: {formatPercentage(account.balanceCents / account.limitCents * 100)}%</p>}
      <p>{ready ? ready.lastPaymentAt === undefined ? "No recorded payment" : `Last payment: ${new Date(ready.lastPaymentAt).toLocaleDateString()}` : "Last payment pending"}</p>
    </div>
    <CreditAgingTable aging={aging} />
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => onRecordPayment(account.customerId)} disabled={busy || !account.isActive || account.balanceCents === 0}>Record Payment</Button>
      <Button variant="outline" onClick={() => onViewHistory(account.customerId)}>View History</Button>
      {(!ready || needsReconciliation) && <Button variant="outline" disabled={busy} onClick={() => onRefreshAllocation(account.customerId)}>Refresh allocation</Button>}
    </div>
  </CardContent></Card>;
}
