"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DataSyncStatusValue } from "@/components/ui/data-sync-status";

type Product = { id: string; product_name: string; sku: string; quantity_on_hand: number; unit_of_measure: string };
export function useIntakeProducts(businessId: string | null) {
  const [snapshot, setSnapshot] = useState<{ businessId: string; inventory: Product[] }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | undefined>(undefined);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    if (!businessId) { setSnapshot(undefined); setError(null); setLoading(false); return; }
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError(null);
    try {
      const inventory: Product[] = [];
      let cursor: string | null = null;
      const seen = new Set<string>();
      do {
        const params = new URLSearchParams({ business_id: businessId });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/inventory/intake/products?${params}`, { cache: "no-store", signal: request.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Products unavailable");
        inventory.push(...result.data);
        if (result.isDone) break;
        if (!result.continueCursor || seen.has(result.continueCursor)) throw new Error("Products could not be fully loaded; retry");
        cursor = result.continueCursor; seen.add(cursor!);
      } while (!request.signal.aborted);
      if (!request.signal.aborted) setSnapshot({ businessId, inventory });
    } catch (failure) {
      if (!request.signal.aborted) { setSnapshot(undefined); setError(failure instanceof Error ? failure.message : "Products unavailable"); }
    } finally { if (!request.signal.aborted) setLoading(false); }
  }, [businessId]);
  useEffect(() => { void refresh(); return () => controller.current?.abort(); }, [refresh]);
  return { inventory: snapshot?.businessId === businessId ? snapshot.inventory : [], loading,
    error, refresh, syncStatus: (loading ? "reconnecting" : error ? "offline" : "snapshot") as DataSyncStatusValue };
}
