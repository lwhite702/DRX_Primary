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
import { useDRXProducts } from "@/lib/convex-hooks";

interface ProductResult {
  id: string;
  name: string;
  price: number;
  quantity_on_hand: number;
  sku?: string | null;
  barcode?: string | null;
  low_stock_threshold?: number;
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
    total,
  } = useQuickPosStore();

  const [bootstrap, setBootstrap] = useState<QuickPosBootstrapResponse | null>(
    null,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [manualPrice, setManualPrice] = useState("");

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
      } catch {
        setError("Unable to load POS");
      } finally {
        setIsBootstrapping(false);
      }
    };

    load();
  }, [setCreditPolicy, setError]);

  const { products: convexProducts } = useDRXProducts();

  useEffect(() => {
    const search = state.ui.search.trim().toLowerCase();
    if (!search) {
      setResults([]);
      return;
    }

    if (convexProducts && convexProducts.length > 0) {
      const filtered = convexProducts
        .filter(
          (p) =>
            p.productName.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search)
        )
        .map((p) => ({
          id: p._id,
          name: p.productName,
          price: p.sellingPriceCents / 100,
          quantity_on_hand: p.quantityOnHandGrams,
          sku: p.sku,
        }));
      setResults(filtered);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/pos/products?search=${encodeURIComponent(search)}`,
        );
        if (!res.ok) {
          setError("Search unavailable");
          setResults([]);
          return;
        }
        const data = (await res.json()) as { items?: ProductResult[] };
        setResults(data.items || []);
      } catch {
        setError("Search unavailable");
        setResults([]);
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [state.ui.search, convexProducts, setError]);

  const submitSearch = async () => {
    const search = state.ui.search.trim();
    if (!search) return;

    try {
      const res = await fetch(
        `/api/pos/products?search=${encodeURIComponent(search)}&exact=1`,
      );
      if (!res.ok) {
        setError("Search failed");
        return;
      }

      const data = (await res.json()) as { items?: ProductResult[] };
      const exactItem = data.items?.[0];
      if (!exactItem) {
        setError("No product matched scan");
        return;
      }

      addInventoryItem(exactItem);
      setSearch("");
      setResults([]);
    } catch {
      setError("Search failed");
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
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
            role="status"
            aria-live="polite"
          >
            Loading register data and favorites...
          </div>
        ) : null}

        <ProductSearch
          value={state.ui.search}
          onChange={setSearch}
          items={results}
          onAdd={addInventoryItem}
          onSubmitSearch={submitSearch}
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
    </div>
  );
}
