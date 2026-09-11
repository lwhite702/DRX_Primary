"use client";
import React from "react";
import { CreditCustomerCard } from "./CreditCustomerCard";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
interface Props { accounts: CreditAccount[]; agingByCustomer: Record<string, CreditAgingResult>; busy?: boolean; onRecordPayment: (id: string) => void; onViewHistory: (id: string) => void; onRefreshAllocation: (id: string) => void }
export function CreditCustomerList({ accounts, agingByCustomer, ...actions }: Props) {
  if (!accounts.length) return <p className="rounded-lg border p-6 text-muted-foreground">No accounts match this view.</p>;
  return <div className="space-y-4">{accounts.map(account => <CreditCustomerCard key={account.customerId} account={account} aging={agingByCustomer[account.customerId]} {...actions} />)}</div>;
}
