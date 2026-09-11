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
  onRecordPayment: (id: string) => void;
  onViewHistory: (id: string) => void;
  onRefreshAllocation: (id: string) => void;
}

export function CreditCustomerList({ accounts, agingByCustomer, ...actions }: Props) {
  if (!accounts.length) {
    return (
      <EmptyState
        icon={Users}
        title="Nothing due"
        description="Everybody is paid up. Nice."
        className="border-dashed border-white/10 bg-transparent"
      />
    );
  }

  return (
    <div className="space-y-4">
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
