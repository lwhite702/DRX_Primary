"use client";

import { formatQuantity, formatCount } from "@/lib/number-format";
import { useRef } from "react";
import { QUICK_POS_LONG_PRESS_MS } from "@/lib/quick-pos/constants";
import type { QuickPosCartItem } from "@/lib/quick-pos/types";
import { Trash2 } from "lucide-react";

export function CartPanel({
  items,
  onTap,
  onLongPressRemove,
  onRemove,
  onClear,
  subtotal,
  total,
}: {
  items: QuickPosCartItem[];
  onTap: (id: string) => void;
  onLongPressRemove: (id: string) => void;
  onRemove?: (id: string) => void;
  onClear?: () => void;
  subtotal: number;
  total: number;
}) {
  const timeoutRef = useRef<number | null>(null);

  const startPress = (id: string) => {
    timeoutRef.current = window.setTimeout(() => {
      if (onRemove) {
        onRemove(id);
      } else {
        onLongPressRemove(id);
      }
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
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {formatCount(items.length)} item{items.length === 1 ? "" : "s"}
          </span>
          {items.length > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded border border-red-500/20 hover:border-red-500/40 transition"
              aria-label="Clear cart"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-muted-foreground">No items</p> : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex h-16 w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-4 text-left transition hover:border-accent/30 hover:bg-accent/5 group"
          >
            <div
              role="button"
              tabIndex={0}
              onPointerDown={() => startPress(item.id)}
              onPointerUp={() => endPress(item.id, !item.weightGrams)}
              onPointerLeave={() => {
                if (timeoutRef.current) {
                  window.clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!item.weightGrams) onTap(item.id);
                }
              }}
              className="flex-1 min-w-0 pr-3 cursor-pointer select-none"
              aria-label={`Increment ${item.name}`}
            >
              <span className="text-lg font-semibold block truncate">
                {item.name}{" "}
                {item.weightGrams
                  ? `${formatQuantity(item.weightGrams)}${item.bulkTierApplied ? ` · ${item.bulkTierApplied}` : ""}`
                  : `x${formatQuantity(item.qty)}${item.bulkTierApplied ? ` · ${item.bulkTierApplied}` : ""}`}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-lg font-semibold text-accent">
                ${(item.unitPrice * item.qty).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemove) {
                    onRemove(item.id);
                  } else {
                    onLongPressRemove(item.id);
                  }
                }}
                className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition"
                aria-label={`Remove ${item.name} from cart`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
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
