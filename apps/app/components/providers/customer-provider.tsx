"use client";

import { createContext, useContext, ReactNode } from "react";
import { useRealtimeCustomers } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";

interface CustomerContextType {
  customers: any[];
  loading: boolean;
  refresh: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined
);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { business } = useBusiness();
  const customers = useRealtimeCustomers(business?.id || null);

  // useRealtimeCustomers handles the initial fetch and subscription
  // We can consider 'loading' true if we have no data yet, though with realtime it's often better to show cached/empty initially.
  // For now, we'll just expose the array.
  // If we wanted explicit loading state, we'd need to modify the hook to return it.

  const value = {
    customers,
    loading: false, // The hook currently doesn't expose loading, defaulting to false
    refresh: () => {
      // Trigger a refresh if needed (though realtime should handle it)
      // This is a placeholder if we want to add manual refetch logic later
    },
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
      "useCustomerContext must be used within a CustomerProvider"
    );
  }
  return context;
}
