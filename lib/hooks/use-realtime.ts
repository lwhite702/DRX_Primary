import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export function useRealtimeInventory(business_id: string | null) {
  const [inventory, setInventory] = useState<any[]>([]);
  // const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business_id || !supabase) return;

    // Initial fetch
    supabase
      .from("inventory")
      .select("*")
      .eq("business_id", business_id)
      .order("product_name")
      .then(({ data, error }: { data: any[] | null; error: any }) => {
        if (!error && data) setInventory(data);
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`inventory:${business_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
          filter: `business_id=eq.${business_id}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setInventory((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setInventory((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setInventory((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business_id, supabase]);

  return inventory;
}

export function useRealtimeSales(business_id: string | null) {
  const [sales, setSales] = useState<any[]>([]);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business_id || !supabase) return;

    // Initial fetch
    supabase
      .from("sales")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }: { data: any[] | null; error: any }) => {
        if (!error && data) setSales(data);
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`sales:${business_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `business_id=eq.${business_id}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setSales((prev) => [payload.new, ...prev].slice(0, 50));
          } else if (payload.eventType === "UPDATE") {
            setSales((prev) =>
              prev.map((sale) =>
                sale.id === payload.new.id ? payload.new : sale
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business_id, supabase]);

  return sales;
}

export function useRealtimeCredit(
  business_id: string | null,
  customer_id?: string | null
) {
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business_id || !supabase) return;

    let query = supabase
      .from("credit_transactions")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (customer_id) {
      query = query.eq("customer_id", customer_id);
    }

    // Initial fetch
    query.then(({ data, error }: { data: any[] | null; error: any }) => {
      if (!error && data) setCreditTransactions(data);
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`credit:${business_id}${customer_id ? `:${customer_id}` : ""}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "credit_transactions",
          filter: customer_id
            ? `business_id=eq.${business_id},customer_id=eq.${customer_id}`
            : `business_id=eq.${business_id}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setCreditTransactions((prev) =>
              [payload.new, ...prev].slice(0, 100)
            );
          } else if (payload.eventType === "UPDATE") {
            setCreditTransactions((prev) =>
              prev.map((tx) => (tx.id === payload.new.id ? payload.new : tx))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business_id, customer_id, supabase]);

  return creditTransactions;
}

export function useRealtimeCustomers(business_id: string | null) {
  const [customers, setCustomers] = useState<any[]>([]);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!business_id || !supabase) return;

    // Initial fetch
    supabase
      .from("customers")
      .select("*")
      .eq("business_id", business_id)
      .order("first_name")
      .then(({ data, error }: { data: any[] | null; error: any }) => {
        if (!error && data) setCustomers(data);
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`customers:${business_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
          filter: `business_id=eq.${business_id}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === "INSERT") {
            setCustomers((prev) =>
              [payload.new, ...prev].sort((a, b) =>
                a.first_name.localeCompare(b.first_name)
              )
            );
          } else if (payload.eventType === "UPDATE") {
            setCustomers((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setCustomers((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business_id, supabase]);

  return customers;
}
