import { useCallback, useEffect, useRef, useState } from "react";
// import { db } from "@wrelik/db/server";

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
  if (!didLogRealtimeBlock) {
    didLogRealtimeBlock = true;
    console.warn(
      `[realtime] live channel '${name}' disabled until @wrelik realtime adapter migration is complete. Falling back to API snapshots.`,
    );
  }
  return null;
}

// Mock db to prevent server-side imports in client bundle
const db = {
  sales: { findMany: async (...args: any[]) => [] },
  creditTransaction: { findMany: async (...args: any[]) => [] },
  customer: { findMany: async (...args: any[]) => [] },
};

export function useRealtimeInventory(business_id: string | null) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedBusinessId = useRef<string | null>(null);
  const stateBusinessId = useRef<string | null>(null);
  const requestController = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!business_id) {
      setInventory([]);
      loadedBusinessId.current = null;
      stateBusinessId.current = null;
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const hasCurrentData = loadedBusinessId.current === business_id;
    stateBusinessId.current = business_id;
    if (!hasCurrentData) setInventory([]);
    setLoading(!hasCurrentData);
    setRefreshing(hasCurrentData);
    setError(null);

    try {
      const response = await fetch(
        `/api/inventory?business_id=${encodeURIComponent(business_id)}`,
        { signal: controller.signal },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error("Failed to load inventory snapshot");
      if (controller.signal.aborted) return;
      setInventory(normalizeInventoryPayload(payload));
      loadedBusinessId.current = business_id;
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      console.warn("[realtime] Failed to load inventory snapshot", {
        errorType: caught instanceof Error ? caught.name : "UnknownError",
      });
      setError("Inventory updates are temporarily unavailable.");
      if (!hasCurrentData) setInventory([]);
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [business_id]);

  useEffect(() => {
    void refresh();
    if (!business_id) return;

    // Subscribe to changes via @wrelik/db realtime
    const channel = openRealtimeChannel(`inventory:${business_id}`);
    if (channel) {
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
    }

    return () => {
      requestController.current?.abort();
      channel?.unsubscribe();
    };
  }, [business_id, refresh]);

  const matchesBusiness = stateBusinessId.current === business_id;
  return {
    inventory: matchesBusiness ? inventory : [],
    loading: loading || Boolean(business_id && !matchesBusiness),
    refreshing: matchesBusiness ? refreshing : false,
    error: matchesBusiness ? error : null,
    syncStatus: refreshing
      ? "reconnecting"
      : error
        ? "offline"
        : "snapshot",
    refresh,
  } as const;
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedBusinessId = useRef<string | null>(null);
  const stateBusinessId = useRef<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!business_id) {
      setCustomers([]);
      loadedBusinessId.current = null;
      stateBusinessId.current = null;
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    const hasCurrentData = loadedBusinessId.current === business_id;
    stateBusinessId.current = business_id;
    if (!hasCurrentData) setCustomers([]);
    setLoading(!hasCurrentData);
    setRefreshing(hasCurrentData);
    setError(null);
    try {
      const response = await fetch(
        `/api/customers?business_id=${encodeURIComponent(business_id)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error("Failed to load customer snapshot");
      }
      if (version !== requestVersion.current) return;
      setCustomers(Array.isArray(payload?.data) ? payload.data : []);
      loadedBusinessId.current = business_id;
    } catch (caught) {
      if (version !== requestVersion.current) return;
      console.warn("[realtime] customer snapshot load failed", {
        errorType: caught instanceof Error ? caught.name : "UnknownError",
      });
      setError("Customer updates are temporarily unavailable.");
      if (!hasCurrentData) setCustomers([]);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [business_id]);

  useEffect(() => {
    void refresh();
    if (!business_id) return;

    // Subscribe to changes
    const channel = openRealtimeChannel(`customers:${business_id}`);
    if (channel) channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "customers",
        filter: `business_id=eq.${business_id}`,
      },
      async (payload: any) => {
        if (payload.eventType === "INSERT") {
          try {
            const id = payload?.new?.id;
            if (!id) return;
            const response = await fetch(`/api/customers/${id}`);
            const normalized = await response.json();
            if (!response.ok || !normalized?.id) return;

            setCustomers((prev) =>
              [
                normalized,
                ...prev.filter((row) => row.id !== normalized.id),
              ].sort((a, b) =>
                (a.first_name || a.alias || "").localeCompare(
                  b.first_name || b.alias || "",
                ),
              ),
            );
          } catch (error) {
            console.warn(
              "[realtime] customer INSERT normalization failed",
              error,
            );
          }
        } else if (payload.eventType === "UPDATE") {
          try {
            const id = payload?.new?.id;
            if (!id) return;
            const response = await fetch(`/api/customers/${id}`);
            const normalized = await response.json();
            if (!response.ok || !normalized?.id) return;

            setCustomers((prev) =>
              prev.map((item) =>
                item.id === normalized.id ? normalized : item,
              ),
            );
          } catch (error) {
            console.warn(
              "[realtime] customer UPDATE normalization failed",
              error,
            );
          }
        } else if (payload.eventType === "DELETE") {
          setCustomers((prev) =>
            prev.filter((item) => item.id !== payload.old.id),
          );
        }
      },
    );

    return () => {
      requestVersion.current += 1;
      channel?.unsubscribe();
    };
  }, [business_id, refresh]);

  const matchesBusiness = stateBusinessId.current === business_id;
  return {
    customers: matchesBusiness ? customers : [],
    loading: loading || Boolean(business_id && !matchesBusiness),
    refreshing: matchesBusiness ? refreshing : false,
    error: matchesBusiness ? error : null,
    syncStatus: refreshing
      ? "reconnecting"
      : error
        ? "offline"
        : "snapshot",
    refresh,
  } as const;
}
