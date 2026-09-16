"use client";

import type { QuickPosBootstrapItem, QuickPosCartItem } from "@/lib/quick-pos/types";
import { formatQuantity } from "@/lib/number-format";

export function QuickGrid({
  title,
  items,
  cartItems = [],
  onAdd,
}: {
  title: string;
  items: QuickPosBootstrapItem[];
  cartItems?: QuickPosCartItem[];
  onAdd: (item: QuickPosBootstrapItem) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => {
          const inCartItem = cartItems.find((c) => c.inventoryId === item.id);
          const inCartBadge = inCartItem
            ? inCartItem.weightGrams
              ? `✓ ${formatQuantity(inCartItem.weightGrams)}`
              : `✓ x${formatQuantity(inCartItem.qty)}`
            : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAdd(item)}
              className={`relative min-h-24 rounded-md border p-3 text-left transition hover:border-accent/30 hover:bg-accent/5 active:scale-[0.99] ${
                inCartItem
                  ? "border-accent/50 bg-accent/10"
                  : "border-white/10 bg-black/40"
              }`}
            >
              {inCartBadge && (
                <span className="absolute top-2 right-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-black shadow-sm">
                  {inCartBadge}
                </span>
              )}
              <div className="line-clamp-2 text-base font-semibold pr-4">
                {item.name}
              </div>
              <div className="mt-2 text-xl font-bold text-accent">
                {item.fractional_config
                  ? `$${item.fractional_config.baseUnitPrice.toFixed(2)}/${item.fractional_config.sellingUnit}`
                  : `$${item.price.toFixed(2)}`}
              </div>
              {item.commerce_config?.bulkPriceTiers.length ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Bulk from {Math.min(...item.commerce_config.bulkPriceTiers.map((tier) => tier.minimumQuantity))} {item.commerce_config.sellingUnit}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
