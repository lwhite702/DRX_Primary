import { useEffect, useState } from "react";
// import { db } from "@wrelik/db/server";
import { getSupabaseClient } from "@/lib/supabase/client";

let didLogRealtimeBlock = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeChannelLike = any;

// Normalize Prisma/camelCase API payloads to the legacy snake_case client shape
// that existing pages still expect while we finish the adapter migration.
function normalizeInventoryItem(item: any) {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    id: item.id,
    sku: item.sku ?? null,
    product_name: item.product_name ?? item.productName ?? "",
    productName: item.productName ?? item.product_name ?? "",
    quantity_on_hand: item.quantity_on_hand ?? item.quantityOnHand ?? 0,
    quantityOnHand: item.quantityOnHand ?? item.quantity_on_hand ?? 0,
    reorder_level: item.reorder_level ?? item.reorderLevel ?? 0,
    reorderLevel: item.reorderLevel ?? item.reorder_level ?? 0,
    unit_of_measure: item.unit_of_measure ?? item.unitOfMeasure ?? "g",
    unitOfMeasure: item.unitOfMeasure ?? item.unit_of_measure ?? "g",
    business_id: item.business_id ?? item.businessId ?? null,
    businessId: item.businessId ?? item.business_id ?? null,
    created_at: item.created_at ?? item.createdAt ?? null,
    createdAt: item.createdAt ?? item.created_at ?? null,
    updated_at: item.updated_at ?? item.updatedAt ?? null,
    updatedAt: item.updatedAt ?? item.updated_at ?? null,
  };
}

function normalizeInventoryPayload(payload: any): any[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  return rows.map(normalizeInventoryItem);
}

function openRealtimeChannel(name: string): RealtimeChannelLike | null {
  try {
    const realtime = getSupabaseClient() as any;
    return realtime.channel(name);
  } catch (error) {
    if (!didLogRealtimeBlock) {
      didLogRealtimeBlock = true;
      console.warn(
        "[realtime] Legacy Supabase realtime channel disabled for this path. Initial data loads will continue without live updates.",
        error,
      );
    }
    return null;
  }
}

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
        setInventory(normalizeInventoryPayload(data));
      })
      .catch((error) => {
        console.warn("[realtime] Failed to load inventory snapshot", error);
        setInventory([]);
      });

    // Subscribe to changes via @wrelik/db realtime
    const channel = openRealtimeChannel(`inventory:${business_id}`);
    if (!channel) return;
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
            setInventory((prev) => [
              ...prev,
              normalizeInventoryItem(payload.new),
            ]);
          } else if (payload.eventType === "UPDATE") {
            setInventory((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? normalizeInventoryItem(payload.new)
                  : item,
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
    const channel = openRealtimeChannel(`sales:${business_id}`);
    if (!channel) return;
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
    const channel = openRealtimeChannel(
      `credit:${business_id}${customer_id ? `:${customer_id}` : ""}`,
    );
    if (!channel) return;
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
    fetch(`/api/customers?business_id=${business_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setCustomers(data.data);
      });

    // Subscribe to changes
    const channel = openRealtimeChannel(`customers:${business_id}`);
    if (!channel) return;
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
              (a.first_name || a.alias || "").localeCompare(
                b.first_name || b.alias || "",
              ),
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
