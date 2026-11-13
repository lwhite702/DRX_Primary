import React from "react";
import { formatAmount } from "@/lib/number-format";
import { CREDIT_AGING_BUCKETS, type CreditAgingResult } from "@/lib/credit/dashboard-client";
export const bucketLabels = { current: "Not overdue", "1_7": "1–7 days late", "8_14": "8–14 days late", "15_30": "15–30 days late", "31_plus": "31+ days late", undated: "No due date", unreconciled: "Needs review" };
export const creditMoney = (cents: number) => `$${formatAmount(cents / 100)}`;
export function CreditAgingTable({ aging }: { aging?: CreditAgingResult }) {
  if (!aging || aging.status === "pending") return <p role="status" className="text-sm text-muted-foreground">Due dates are still being checked. Time owed is not available yet.</p>;
  const day = Math.floor((aging.asOfDate - (aging.oldestDueAt ?? aging.asOfDate)) / 86_400_000);
  const oldest = aging.bucketsCents.unreconciled > 0 && aging.oldestDueAt === undefined ? "Some due dates need review." : aging.oldestDueAt === undefined ? "No due date is set for the open balance." : day > 0 ? `Oldest amount is ${day} ${day === 1 ? "day" : "days"} late.` : day === 0 ? "Oldest amount is due today." : `Oldest amount is due in ${Math.abs(day)} ${Math.abs(day) === 1 ? "day" : "days"}.`;
  const visibleBuckets = CREDIT_AGING_BUCKETS.filter(bucket => bucket !== "unreconciled" && aging.bucketsCents[bucket] > 0);
  return <div className="space-y-2">
    <p className="text-sm font-medium">{oldest}</p>
    {visibleBuckets.length > 0 && <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {visibleBuckets.map(bucket => <div key={bucket} className="flex gap-1.5"><dt className="text-muted-foreground">{bucketLabels[bucket]}:</dt><dd className="font-medium">{creditMoney(aging.bucketsCents[bucket])}</dd></div>)}
    </dl>}
    {aging.bucketsCents.unreconciled > 0 && <p className="text-sm text-amber-700 dark:text-amber-300">Some balance amounts need review before a full due-date breakdown is available.</p>}
  </div>;
}
