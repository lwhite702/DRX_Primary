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
import { quickPosBootstrapResponseSchema } from "@/lib/pos/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { FractionalEntryDialog } from "@/components/quick-pos/fractional-entry-dialog";
import type { QuickPosBootstrapItem } from "@/lib/quick-pos/types";
import { CustomerAlertModal } from "@/components/customers/CustomerAlertModal";

type ProductResult = QuickPosBootstrapItem & { low_stock_threshold?: number };

export default function QuickPosSalePage() {
  const router = useRouter();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const {
    state,
    subtotal,
    addItem,
    incrementItem,
    removeItem,
    updateItemPrice,
    setCustomer,
    setSearch,
    setCreditPolicy,
    setCardFeePolicy,
    setDeliveryFeeTaxable,
    setDiscount,
    clearDiscount,
    setError,
    setSuccess,
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

        const json = await res.json();
        const parsed = quickPosBootstrapResponseSchema.safeParse(json);
        if (!parsed.success) {
          setError("Unable to load POS");
          return;
        }

        const data = parsed.data;
        setBootstrap(data);
        setCreditPolicy(Boolean(data.creditPolicy?.enabled));
        setDeliveryFeeTaxable(Boolean(data.deliveryPolicy?.feeTaxable));
        if (data.cardFeePolicy) {
          setCardFeePolicy(data.cardFeePolicy);
        }
      } catch {
        setError("Unable to load POS");
      } finally {
        setIsBootstrapping(false);
      }
    };

    load();
  }, [setCardFeePolicy, setCreditPolicy, setDeliveryFeeTaxable, setError]);

  useEffect(() => {
    const onAddFavorite = (event: Event) => {
      const custom = event as CustomEvent<{
        productId: string;
        name: string;
        unitPrice: number;
      }>;
      const fav = custom.detail;
      if (!fav?.productId) return;
      addItem({
        id: `inv:${fav.productId}`,
        inventoryId: fav.productId,
        name: fav.name,
        unitPrice: fav.unitPrice,
        qty: 1,
        source: "inventory",
      });
      setError(null);
      setSuccess(`Added ${fav.name} to cart`);
    };
    window.addEventListener("drx:quick-pos-add-favorite", onAddFavorite);
    return () => {
      window.removeEventListener("drx:quick-pos-add-favorite", onAddFavorite);
    };
  }, [addItem, setError, setSuccess]);

  useEffect(() => {
    if (!state.ui.successMessage) return;
    const timer = window.setTimeout(() => {
      setSuccess(null);
    }, 2500);
    return () => { window.clearTimeout(timer); };
  }, [state.ui.successMessage, setSuccess]);

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

    const existing = state.cartItems.find((ci) => ci.id === `inv:${item.id}`);
    const newQty = (existing?.qty ?? 0) + 1;

    addItem({
      id: `inv:${item.id}`,
      inventoryId: item.id,
      name: item.name,
      unitPrice: item.price,
      qty: 1,
      source: "inventory",
    });
    setError(null);
    setSuccess(
      newQty > 1
        ? `${item.name} quantity updated (${newQty})`
        : `Added ${item.name} to cart`
    );
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
    setSuccess(`Added Manual Item ($${value.toFixed(2)}) to cart`);
  };

  const handleClearCart = () => {
    try {
      state.cartItems.forEach((item) => removeItem(item.id));
      setSuccess("Cart cleared");
    } catch {
      setError("Failed to clear cart");
    }
  };

  const handleRemoveItem = (id: string) => {
    try {
      const item = state.cartItems.find((ci) => ci.id === id);
      removeItem(id);
      if (item) {
        setSuccess(`Removed ${item.name} from cart`);
      }
    } catch {
      setError("Failed to remove item");
    }
  };

  const totalCartItems = useMemo(
    () => state.cartItems.reduce((sum, item) => sum + item.qty, 0),
    [state.cartItems],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <StatusFeedback
          error={state.ui.hardError}
          success={state.ui.successMessage}
        />
        <ProductSearch
          value={state.ui.search}
          onChange={setSearch}
          items={results}
          onAdd={selectInventoryItem}
          onSubmitSearch={submitSearch}
        />

        {isBootstrapping ? (
          <section
            className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm"
            role="status"
            aria-label="Loading register data and favorites"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-3" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="min-h-24 rounded-md border border-white/10 bg-black/40 p-3 space-y-2 animate-pulse"
                >
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-6 w-1/2 rounded bg-white/10" />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-4 apple-enter">
            <QuickGrid
              title="Favorite Items"
              items={bootstrap?.favorites || []}
              cartItems={state.cartItems}
              onAdd={selectInventoryItem}
            />

            <QuickGrid
              title="Recently Sold"
              items={bootstrap?.recentlySold || []}
              cartItems={state.cartItems}
              onAdd={selectInventoryItem}
            />
          </div>
        )}

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
          onRemove={handleRemoveItem}
          onClear={handleClearCart}
          onUpdatePrice={(id, newPrice, reason) => {
            updateItemPrice(id, newPrice, reason);
            setSuccess("Price override applied");
          }}
          subtotal={subtotal}
          total={total}
          discountAmountCents={state.discount.amountCents}
          discountReason={state.discount.reason}
          onSetDiscount={setDiscount}
          onClearDiscount={clearDiscount}
        />

        <CustomerInline
          attached={state.customer}
          onAttach={(customer) => {
            try {
              const rich = customer as any;
              setCustomer({
                id: customer.id,
                phone: customer.phone,
                alias: customer.alias,
                remainingCredit: customer.remainingCredit,
                totalCreditUsed: rich.totalCreditUsed ?? 0,
                creditLimit: rich.creditLimit ?? 0,
                loyaltyTier: rich.loyaltyTier ?? null,
                discountRateBps: rich.discountRateBps ?? null,
                fixedPricePerGram: rich.fixedPricePerGram ?? null,
                customProductPrices: rich.customProductPrices ?? [],
                purchaseCount: rich.purchaseCount,
                totalPurchases: rich.totalPurchases,
              });
              setSuccess(`Attached ${customer.alias || customer.phone || "customer"}`);

              // Automatically trigger alert modal if outstanding balance or active alerts exist
              if ((rich.totalCreditUsed ?? 0) > 0) {
                setShowAlertModal(true);
              } else if (customer.id) {
                fetch(`/api/customers/${customer.id}/notes`)
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.alerts?.length > 0 || data.hasOutstandingBalance) {
                      setShowAlertModal(true);
                    }
                  })
                  .catch(() => {});
              }
            } catch {
              setError("Failed to attach customer");
            }
          }}
          onDetach={() => {
            setCustomer({ id: null, phone: "", alias: null, remainingCredit: 0 });
            setSuccess("Customer detached");
          }}
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <button
            type="button"
            onClick={() => router.push("/pos/payment")}
            disabled={state.cartItems.length === 0 || isBootstrapping}
            className="h-16 w-full rounded-lg bg-accent text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Continue to Payment"
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

      {/* Sticky Mobile Cart Bar */}
      {state.cartItems.length > 0 && (
        <div className="md:hidden fixed bottom-16 inset-x-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {totalCartItems} items in cart
              </p>
              <p className="text-lg font-bold font-mono text-accent">
                ${total.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/pos/payment")}
              className="h-12 px-6 rounded-xl bg-accent text-black text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-95 transition-all flex items-center gap-2"
              aria-label={`Checkout with total ${total.toFixed(2)}`}
            >
              <span>Pay ${total.toFixed(2)}</span>
              <span className="text-base font-bold">→</span>
            </button>
          </div>
        </div>
      )}

      {state.customer.id && (
        <CustomerAlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          customerId={state.customer.id}
          customerName={state.customer.alias || state.customer.phone || "Customer"}
          totalCreditUsed={
            state.customer.totalCreditUsed ??
            (state.customer.creditLimit
              ? Math.max(0, state.customer.creditLimit - (state.customer.remainingCredit ?? 0))
              : 0)
          }
          createdFrom="sale_screen"
        />
      )}
    </div>
  );
}
