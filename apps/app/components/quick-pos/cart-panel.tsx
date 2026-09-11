"use client";

import { formatQuantity, formatCount } from "@/lib/number-format";
import { useRef } from "react";
import { QUICK_POS_LONG_PRESS_MS } from "@/lib/quick-pos/constants";
import type { QuickPosCartItem } from "@/lib/quick-pos/types";

export function CartPanel({
  items,
  onTap,
  onLongPressRemove,
  subtotal,
  total,
}: {
  items: QuickPosCartItem[];
  onTap: (id: string) => void;
  onLongPressRemove: (id: string) => void;
  subtotal: number;
  total: number;
}) {
  const timeoutRef = useRef<number | null>(null);

  const startPress = (id: string) => {
    timeoutRef.current = window.setTimeout(() => {
      onLongPressRemove(id);
      timeoutRef.current = null;
    }, QUICK_POS_LONG_PRESS_MS);
  };

  const endPress = (id: string, incrementable: boolean) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (incrementable) onTap(id);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cart</h2>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {formatCount(items.length)} item{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-muted-foreground">No items</p> : null}

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onPointerDown={() => startPress(item.id)}
            onPointerUp={() => endPress(item.id, !item.weightGrams)}
            onPointerLeave={() => {
              if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }}
            className="flex h-16 w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-4 text-left transition hover:border-accent/30 hover:bg-accent/5"
          >
            <span className="text-lg font-semibold">
              {item.name}{" "}
              {item.weightGrams
                ? `${formatQuantity(item.weightGrams)}${item.bulkTierApplied ? ` · ${item.bulkTierApplied}` : ""}`
                : `x${formatQuantity(item.qty)}${item.bulkTierApplied ? ` · ${item.bulkTierApplied}` : ""}`}
            </span>
            <span className="text-lg font-semibold text-accent">${(item.unitPrice * item.qty).toFixed(2)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3 text-lg">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-2xl font-bold">
          <span>Total</span>
          <span className="text-accent">${total.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
