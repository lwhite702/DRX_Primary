"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductSearch } from "@/components/quick-pos/product-search";
import { QuickGrid } from "@/components/quick-pos/quick-grid";
import { PosKeypad } from "@/components/quick-pos/pos-keypad";
import { CartPanel } from "@/components/quick-pos/cart-panel";
import { CustomerInline } from "@/components/quick-pos/customer-inline";
import { StatusFeedback } from "@/components/quick-pos/status-feedback";
import { useQuickPosStore } from "@/lib/quick-pos/store";
import type { QuickPosBootstrapResponse } from "@/lib/quick-pos/types";

interface ProductResult {
  id: string;
  name: string;
  price: number;
  quantity_on_hand: number;
}

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
    setError,
  } = useQuickPosStore();

  const [bootstrap, setBootstrap] = useState<QuickPosBootstrapResponse | null>(null);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [manualPrice, setManualPrice] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/pos/bootstrap");
      if (!res.ok) {
        setError("Unable to load POS");
        return;
      }

      const data = (await res.json()) as QuickPosBootstrapResponse;
      setBootstrap(data);
      setCreditPolicy(data.creditPolicy.enabled);
    };

    load();
  }, [setCreditPolicy, setError]);

  useEffect(() => {
    const search = state.ui.search.trim();
    if (!search) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/pos/products?search=${encodeURIComponent(search)}`);
      const data = (await res.json()) as { items?: ProductResult[] };
      setResults(data.items || []);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [state.ui.search]);

  const addInventoryItem = (item: { id: string; name: string; price: number; quantity_on_hand?: number }) => {
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
    () => state.cartItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [state.cartItems],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <StatusFeedback error={state.ui.hardError} success={state.ui.successMessage} />

        <ProductSearch
          value={state.ui.search}
          onChange={setSearch}
          items={results}
          onAdd={addInventoryItem}
        />

        <QuickGrid
          title="Favorite Items"
          items={bootstrap?.favorites || []}
          onAdd={addInventoryItem}
        />

        <QuickGrid
          title="Recently Sold"
          items={bootstrap?.recentlySold || []}
          onAdd={addInventoryItem}
        />

        <PosKeypad value={manualPrice} onChange={setManualPrice} onAdd={addManualItem} />
      </div>

      <div className="space-y-4">
        <CartPanel
          items={state.cartItems}
          onTap={incrementItem}
          onLongPressRemove={removeItem}
          subtotal={subtotal}
          total={subtotal}
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

        <button
          type="button"
          onClick={() => router.push("/pos/payment")}
          disabled={state.cartItems.length === 0}
          className="h-16 w-full rounded-md bg-white text-2xl font-bold text-black disabled:opacity-50"
        >
          Take Payment
        </button>
      </div>
    </div>
  );
}
