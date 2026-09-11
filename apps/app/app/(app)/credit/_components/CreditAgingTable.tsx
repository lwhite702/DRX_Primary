import React from "react";
import { formatAmount } from "@/lib/number-format";
import { CREDIT_AGING_BUCKETS, type CreditAgingResult } from "@/lib/credit/dashboard-client";
export const bucketLabels = { current: "Current", "1_7": "1–7 days overdue", "8_14": "8–14 days overdue", "15_30": "15–30 days overdue", "31_plus": "31+ days overdue", undated: "No due date", unreconciled: "Unreconciled" };
export const creditMoney = (cents: number) => `$${formatAmount(cents / 100)}`;
export function CreditAgingTable({ aging }: { aging?: CreditAgingResult }) {
  if (!aging || aging.status === "pending") return <p role="status" className="text-sm text-muted-foreground">Aging pending. Refresh allocation to calculate due-date buckets.</p>;
  return <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
    {CREDIT_AGING_BUCKETS.map(bucket => <div key={bucket}><dt className="text-xs text-muted-foreground">{bucketLabels[bucket]}</dt><dd className="font-mono font-medium">{creditMoney(aging.bucketsCents[bucket])}</dd></div>)}
  </dl>;
}
