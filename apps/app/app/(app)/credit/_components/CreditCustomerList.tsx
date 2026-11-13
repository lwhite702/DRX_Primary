"use client";
import React from "react";
import { CreditCustomerCard } from "./CreditCustomerCard";
import type { CreditAccount, CreditAgingResult } from "@/lib/credit/dashboard-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

interface Props {
  accounts: CreditAccount[];
  agingByCustomer: Record<string, CreditAgingResult>;
  busy?: boolean;
  searching?: boolean;
  searchTerm?: string;
  searchError?: string | null;
  onRetrySearch?: () => void;
  onRecordPayment: (id: string) => void;
  onAddBalance: (id: string) => void;
  onViewHistory: (id: string) => void;
  onRefreshAllocation: (id: string) => void;
}

export function CreditCustomerList({ accounts, agingByCustomer, searching, searchTerm, searchError, onRetrySearch, ...actions }: Props) {
  if (!accounts.length) {
    return (
      <section className="space-y-3 rounded-xl border border-dashed p-6 text-center">
        {searching ? <p role="status" className="text-sm text-muted-foreground">Searching all customer names and aliases…</p> : searchError ? <><p role="alert" className="text-sm text-destructive">{searchError}</p><button type="button" onClick={onRetrySearch} className="text-sm font-medium underline underline-offset-4">Try search again</button></> : searchTerm?.trim() ? <EmptyState icon={Users} title="No customers found" description="Try another name or alias." className="bg-transparent" /> : <EmptyState icon={Users} title="No customer accounts yet" description="Customer balances will appear here when credit is recorded." className="bg-transparent" />}
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {searching && <p role="status" className="text-sm text-muted-foreground">Checking the rest of the customer list…</p>}
      {searchError && <p role="alert" className="text-sm text-destructive">Some due-date details could not be loaded. Refresh balances before recording a payment.</p>}
      {accounts.map((account) => (
        <CreditCustomerCard
          key={account.customerId}
          account={account}
          aging={agingByCustomer[account.customerId]}
          {...actions}
        />
      ))}
    </div>
  );
}
