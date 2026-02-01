"use client";

import React, { useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { CreditExposureDashboard } from "@/components/credit/CreditExposureDashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

// Components
import { CreditHeader } from "./_components/CreditHeader";
import { CreditStats } from "./_components/CreditStats";
import { CreditAgingTable } from "./_components/CreditAgingTable";
import { CreditTransactionsList } from "./_components/CreditTransactionsList";
import { ExtensionDialog } from "./_components/ExtensionDialog";
import { PaymentDialog } from "./_components/PaymentDialog";

// Hook
import { useCreditManager } from "./_hooks/useCreditManager";

export default function CreditPage() {
  const { business, loading: businessLoading } = useBusiness();
  const {
    customers,
    agingData, // This is unfiltered
    transactions,
    loading: creditLoading,
    handleExtension,
    handlePayment,
    showExtensionDialog,
    setShowExtensionDialog,
    showPaymentDialog,
    setShowPaymentDialog,
  } = useCreditManager(business?.id);

  const [searchTerm, setSearchTerm] = useState("");

  if (businessLoading || (creditLoading && !agingData.length)) {
    // Show skeleton if initial load
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rowCount={5} columnCount={6} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  // Filter Data
  const filteredAgingData = agingData.filter((a) =>
    a.customer_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate Stats
  const pendingTransactions = transactions.filter(
    (tx) => tx.status === "pending",
  );

  const delinquentCount = filteredAgingData.filter(
    (a) => Number(a.bucket_31_plus) > 0 || Number(a.bucket_15_30) > 0,
  ).length;

  const totalOutstanding = agingData.reduce(
    (sum, a) => sum + Number(a.total_outstanding || 0),
    0,
  );

  return (
    <div className="p-4 md:p-8 space-y-6 page-transition">
      <CreditHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenPayment={() => setShowPaymentDialog(true)}
        onOpenExtension={() => setShowExtensionDialog(true)}
      />

      <CreditExposureDashboard business_id={business.id} />

      <CreditStats
        pendingCount={pendingTransactions.length}
        delinquentCount={delinquentCount}
        totalOutstanding={totalOutstanding}
      />

      <CreditAgingTable data={filteredAgingData} />

      {transactions.length > 0 ? (
        <CreditTransactionsList transactions={transactions} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={FileText}
              title="No transactions yet"
              description="Extension and payment history will appear here."
              className="border-none bg-transparent"
            />
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ExtensionDialog
        open={showExtensionDialog}
        onOpenChange={setShowExtensionDialog}
        customers={customers}
        onSubmit={handleExtension}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        customers={customers}
        onSubmit={handlePayment}
      />
    </div>
  );
}
