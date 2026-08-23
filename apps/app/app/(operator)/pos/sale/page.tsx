"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductSearch } from "@/components/quick-pos/product-search";
import { QuickGrid } from "@/components/quick-pos/quick-grid";
import { PosKeypad } from "@/components/quick-pos/pos-keypad";
import { CartPanel } from "@/components/quick-pos/cart-panel";
import { CustomerInline } from "@/components/quick-pos/customer-inline";
import { StatusFeedback } from "@/components/quick-pos/status-feedback";
import { useQuickPosStore } from "@/lib/quick-pos/store";
import type { QuickPosBootstrapResponse } from "@/lib/quick-pos/types";
import { Skeleton } from "@/components/ui/skeleton";
import { FractionalEntryDialog } from "@/components/quick-pos/fractional-entry-dialog";
import type { QuickPosBootstrapItem } from "@/lib/quick-pos/types";

type ProductResult = QuickPosBootstrapItem & { low_stock_threshold?: number };

export default function QuickPosSalePage() {
  const router = useRouter();
  const {
    state,
    addItem,
    incrementItem,
    removeItem,
    setCustomer,
    setSearch,
    setCreditPolicy,
    setDeliveryFeeTaxable,
    setError,
    total,
  } = useQuickPosStore();

  const [bootstrap, setBootstrap] = useState<QuickPosBootstrapResponse | null>(
    null,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [manualPrice, setManualPrice] = useState("");
  const [fractionalProduct, setFractionalProduct] =
    useState<QuickPosBootstrapItem | null>(null);
  const searchSequence = useRef(0);
  const activeSearchController = useRef<AbortController | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/pos/bootstrap");
        if (!res.ok) {
          setError("Unable to load POS");
          return;
        }

        const data = (await res.json()) as QuickPosBootstrapResponse;
        setBootstrap(data);
        setCreditPolicy(data.creditPolicy.enabled);
        setDeliveryFeeTaxable(data.deliveryPolicy.feeTaxable);
      } catch {
        setError("Unable to load POS");
      } finally {
        setIsBootstrapping(false);
      }
    };

    load();
  }, [setCreditPolicy, setDeliveryFeeTaxable, setError]);

  useEffect(() => {
    const search = state.ui.search.trim().toLowerCase();
    const requestId = ++searchSequence.current;
    activeSearchController.current?.abort();

    if (!search) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    activeSearchController.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/pos/products?search=${encodeURIComponent(search)}`,
          { signal: controller.signal },
        );
        if (requestId !== searchSequence.current) return;
        if (!res.ok) {
          setError("Search unavailable");
          setResults([]);
          return;
        }
        const data = (await res.json()) as { items?: ProductResult[] };
        if (requestId !== searchSequence.current) return;
        setResults(data.items || []);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (requestId !== searchSequence.current) return;
        setError("Search unavailable");
        setResults([]);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [state.ui.search, setError]);

  const submitSearch = async () => {
    const search = state.ui.search.trim();
    if (!search) return;

    const requestId = ++searchSequence.current;
    activeSearchController.current?.abort();
    const controller = new AbortController();
    activeSearchController.current = controller;

    try {
      const res = await fetch(
        `/api/pos/products?search=${encodeURIComponent(search)}&exact=1`,
        { signal: controller.signal },
      );
      if (requestId !== searchSequence.current) return;
      if (!res.ok) {
        setError("Search failed");
        return;
      }

      const data = (await res.json()) as { items?: ProductResult[] };
      if (requestId !== searchSequence.current) return;
      const exactItem = data.items?.[0];
      if (!exactItem) {
        setError("No product matched scan");
        return;
      }

      selectInventoryItem(exactItem);
      setSearch("");
      setResults([]);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId !== searchSequence.current) return;
      setError("Search failed");
    } finally {
      if (activeSearchController.current === controller) {
        activeSearchController.current = null;
      }
    }
  };

  const addInventoryItem = (item: {
    id: string;
    name: string;
    price: number;
    quantity_on_hand?: number;
  }) => {
    if (item.quantity_on_hand !== undefined && item.quantity_on_hand <= 0) {
      setError("Out of stock");
      return;
    }

    addItem({
      id: `inv:${item.id}`,
      inventoryId: item.id,
      name: item.name,
      unitPrice: item.price,
      qty: 1,
      source: "inventory",
    });
    setError(null);
  };

  const selectInventoryItem = (item: QuickPosBootstrapItem) => {
    if (
      item.commerce_config?.fractionalEnabled ||
      (item.commerce_config?.bulkPriceTiers.length ?? 0) > 0
    ) {
      setFractionalProduct(item);
      return;
    }
    addInventoryItem(item);
  };

  const addManualItem = () => {
    const value = Number(manualPrice || 0);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter valid manual price");
      return;
    }

    addItem({
      id: `manual:${Date.now()}`,
      inventoryId: null,
      name: "Manual Item",
      unitPrice: value,
      qty: 1,
      source: "manual",
    });
    setManualPrice("");
    setError(null);
  };

  const subtotal = useMemo(
    () =>
      state.cartItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [state.cartItems],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <StatusFeedback
          error={state.ui.hardError}
          success={state.ui.successMessage}
        />
        {isBootstrapping ? (
          <div
            className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4"
            role="status"
            aria-label="Loading register data and favorites"
            aria-busy="true"
            aria-live="polite"
          >
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-14 bg-white/10" />
            ))}
          </div>
        ) : null}

        <ProductSearch
          value={state.ui.search}
          onChange={setSearch}
          items={results}
          onAdd={selectInventoryItem}
          onSubmitSearch={submitSearch}
        />

        <QuickGrid
          title="Favorite Items"
          items={bootstrap?.favorites || []}
          onAdd={selectInventoryItem}
        />

        <QuickGrid
          title="Recently Sold"
          items={bootstrap?.recentlySold || []}
          onAdd={selectInventoryItem}
        />

        <PosKeypad
          value={manualPrice}
          onChange={setManualPrice}
          onAdd={addManualItem}
        />
      </div>

      <div className="space-y-4">
        <CartPanel
          items={state.cartItems}
          onTap={incrementItem}
          onLongPressRemove={removeItem}
          subtotal={subtotal}
          total={total}
        />

        <CustomerInline
          attached={state.customer}
          onAttach={(customer) =>
            setCustomer({
              id: customer.id,
              phone: customer.phone,
              alias: customer.alias,
              remainingCredit: customer.remainingCredit,
            })
          }
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <button
            type="button"
            onClick={() => router.push("/pos/payment")}
            disabled={state.cartItems.length === 0 || isBootstrapping}
            className="h-16 w-full rounded-lg bg-accent text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Continue to payment"
          >
            Continue to Payment
          </button>
          <p className="mt-2 text-center text-xs text-white/60">
            Scan, search, or tap items to build the cart, then complete the
            sale.
          </p>
        </div>
      </div>
      <FractionalEntryDialog
        product={fractionalProduct}
        onClose={() => setFractionalProduct(null)}
        onAdd={(item) => {
          addItem(item);
          setError(null);
        }}
      />
    </div>
  );
}
