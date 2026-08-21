"use client";

import { createContext, useContext, ReactNode } from "react";
import { useRealtimeCustomers } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";

interface CustomerContextType {
  customers: any[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  syncStatus: "snapshot" | "reconnecting" | "offline";
  refresh: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined,
);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { business } = useBusiness();
  const { customers, loading, refreshing, error, syncStatus, refresh } =
    useRealtimeCustomers(business?.id || null);

  const value = {
    customers,
    loading,
    refreshing,
    error,
    syncStatus,
    refresh,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomerContext() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error(
      "useCustomerContext must be used within a CustomerProvider",
    );
  }
  return context;
}
