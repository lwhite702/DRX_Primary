import { useEffect, useState } from "react";
// import { db } from "@wrelik/db";
import { getSupabaseClient } from "@/lib/supabase/client";

// Mocks for build
const realtime = getSupabaseClient();
// Mock db to prevent server-side imports in client bundle
const db = {
  sales: { findMany: async (...args: any[]) => [] },
  creditTransaction: { findMany: async (...args: any[]) => [] },
  customer: { findMany: async (...args: any[]) => [] },
};

export function useRealtimeInventory(business_id: string | null) {
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    if (!business_id) return;

    // Initial fetch
    // Initial fetch
    fetch(`/api/inventory?business_id=${business_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setInventory(data);
      });

    // Subscribe to changes via @wrelik/db realtime
    const channel = realtime.channel(`inventory:${business_id}`);
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
          filter: `business_id=eq.${business_id}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setInventory((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setInventory((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setInventory((prev) =>
              prev.filter((item) => item.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [business_id]);

  return inventory;
}

export function useRealtimeSales(business_id: string | null) {
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    if (!business_id) return;

    // Initial fetch
    db.sales
      .findMany({
        where: { business_id },
        orderBy: { created_at: "desc" },
        take: 50,
      })
      .then((data) => {
        if (data) setSales(data);
      });

    // Subscribe to changes
    const channel = realtime.channel(`sales:${business_id}`);
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sales",
        filter: `business_id=eq.${business_id}`,
      },
      (payload: any) => {
        if (payload.eventType === "INSERT") {
          setSales((prev) => [payload.new, ...prev].slice(0, 50));
        } else if (payload.eventType === "UPDATE") {
          setSales((prev) =>
            prev.map((sale) =>
              sale.id === payload.new.id ? payload.new : sale,
            ),
          );
        }
      },
    );

    return () => {
      channel.unsubscribe();
    };
  }, [business_id]);

  return sales;
}

export function useRealtimeCredit(
  business_id: string | null,
  customer_id?: string | null,
) {
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!business_id) return;

    let where: any = { business_id };

    if (customer_id) {
      where = { ...where, customer_id };
    }

    // Initial fetch
    db.creditTransaction
      .findMany({
        where,
        orderBy: { created_at: "desc" },
        take: 100,
      })
      .then((data) => {
        if (data) setCreditTransactions(data);
      });

    // Subscribe to changes
    const channel = realtime.channel(
      `credit:${business_id}${customer_id ? `:${customer_id}` : ""}`,
    );
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "credit_transactions",
        filter: customer_id
          ? `business_id=eq.${business_id},customer_id=eq.${customer_id}`
          : `business_id=eq.${business_id}`,
      },
      (payload: any) => {
        if (payload.eventType === "INSERT") {
          setCreditTransactions((prev) => [payload.new, ...prev].slice(0, 100));
        } else if (payload.eventType === "UPDATE") {
          setCreditTransactions((prev) =>
            prev.map((tx) => (tx.id === payload.new.id ? payload.new : tx)),
          );
        }
      },
    );

    return () => {
      channel.unsubscribe();
    };
  }, [business_id, customer_id]);

  return creditTransactions;
}

export function useRealtimeCustomers(business_id: string | null) {
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (!business_id) return;

    // Initial fetch
    db.customer
      .findMany({
        where: { business_id },
        orderBy: { first_name: "asc" },
      })
      .then((data) => {
        if (data) setCustomers(data);
      });

    // Subscribe to changes
    const channel = realtime.channel(`customers:${business_id}`);
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "customers",
        filter: `business_id=eq.${business_id}`,
      },
      (payload: any) => {
        if (payload.eventType === "INSERT") {
          setCustomers((prev) =>
            [payload.new, ...prev].sort((a, b) =>
              a.first_name.localeCompare(b.first_name),
            ),
          );
        } else if (payload.eventType === "UPDATE") {
          setCustomers((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? payload.new : item,
            ),
          );
        } else if (payload.eventType === "DELETE") {
          setCustomers((prev) =>
            prev.filter((item) => item.id !== payload.old.id),
          );
        }
      },
    );

    return () => {
      channel.unsubscribe();
    };
  }, [business_id]);

  return customers;
}
