import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { CreditDashboardTransaction } from "../_hooks/useCreditManager";
import { creditMoney } from "./CreditAgingTable";
export function CreditTransactionsList({ transactions }: { transactions: CreditDashboardTransaction[] }) {
  if (!transactions.length) return <p className="text-sm text-muted-foreground">No loaded transactions for this view.</p>;
  return <div className="space-y-3">{transactions.map(tx => <Card key={tx.id}><CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
    <div><p className="font-medium">{tx.customerLabel}</p><p className="text-sm capitalize">{tx.transactionType}</p><p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
      {tx.dueDate && <p className="text-xs text-muted-foreground">Due date: {tx.dueDate.slice(0, 10)}</p>}
      {tx.paymentMethod && <p className="text-xs capitalize text-muted-foreground">Payment method: {tx.paymentMethod}</p>}
    </div><div className="text-right"><p className="font-mono font-semibold">{creditMoney(tx.amountCents)}</p><p className="text-xs">{tx.status === "unreconciled" ? "Needs reconciliation" : "Completed"}</p></div>
  </CardContent></Card>)}</div>;
}
