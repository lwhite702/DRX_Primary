"use client";

import React from "react";
import { CreditCustomerCard } from "./CreditCustomerCard";
import { AgingData } from "./CreditAgingTable";
import { CreditLimit } from "@/lib/validations/schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

interface CreditCustomerListProps {
  data: AgingData[];
  creditLimits: Map<string, CreditLimit>;
  isLoading: boolean;
  onRecordPayment: (customerId: string) => void;
  onViewHistory: (customerId: string) => void;
}

export function CreditCustomerList({
  data,
  creditLimits,
  isLoading,
  onRecordPayment,
  onViewHistory,
}: CreditCustomerListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-[240px] w-full rounded-xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
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
      {data.map((item) => {
        const limitData = creditLimits.get(item.customer_id);
        const limit = Number(limitData?.max_credit_limit || 0);

        return (
          <CreditCustomerCard
            key={item.customer_id}
            data={item}
            limit={limit}
            onRecordPayment={onRecordPayment}
            onViewHistory={onViewHistory}
          />
        );
      })}
    </div>
  );
}
