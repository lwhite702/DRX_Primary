"use client";

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

  const endPress = (id: string) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      onTap(id);
    }
  };

  return (
    <section className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-lg font-semibold">Cart</h2>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-neutral-400">No items</p> : null}

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onPointerDown={() => startPress(item.id)}
            onPointerUp={() => endPress(item.id)}
            onPointerLeave={() => {
              if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }}
            className="flex h-16 w-full items-center justify-between rounded-md border border-neutral-700 bg-black px-4 text-left"
          >
            <span className="text-lg font-semibold">
              {item.name} x{item.qty}
            </span>
            <span className="text-lg">${(item.unitPrice * item.qty).toFixed(2)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-neutral-800 pt-3 text-lg">
        <div className="flex items-center justify-between">
          <span className="text-neutral-300">Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-2xl font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
