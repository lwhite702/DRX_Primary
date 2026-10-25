"use client";

import { formatQuantity, formatCount } from "@/lib/number-format";
import { useRef, useState } from "react";
import { QUICK_POS_LONG_PRESS_MS } from "@/lib/quick-pos/constants";
import type { QuickPosCartItem } from "@/lib/quick-pos/types";
import { Trash2, Edit2 } from "lucide-react";
import { PriceOverrideModal } from "@/components/pos/price-override-modal";

export function CartPanel({
  items,
  onTap,
  onLongPressRemove,
  onRemove,
  onClear,
  onUpdatePrice,
  managerPin,
  subtotal,
  total,
  discountAmountCents,
  discountReason,
  onSetDiscount,
  onClearDiscount,
}: {
  items: QuickPosCartItem[];
  onTap: (id: string) => void;
  onLongPressRemove: (id: string) => void;
  onRemove?: (id: string) => void;
  onClear?: () => void;
  onUpdatePrice?: (id: string, newPrice: number, reason: string) => void;
  managerPin?: string | null;
  subtotal: number;
  total: number;
  discountAmountCents?: number;
  discountReason?: string;
  onSetDiscount?: (cents: number, reason?: string) => void;
  onClearDiscount?: () => void;
}) {
  const [overrideItem, setOverrideItem] = useState<QuickPosCartItem | null>(null);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountReasonInput, setDiscountReasonInput] = useState("");
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
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-lg font-semibold text-accent">
                    ${(item.unitPrice * item.qty).toFixed(2)}
                  </span>
                  {onUpdatePrice && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverrideItem(item);
                      }}
                      className="p-1 text-muted-foreground hover:text-accent hover:bg-white/10 rounded transition"
                      aria-label={`Override price for ${item.name}`}
                      title="Override price"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {item.originalPrice !== undefined && item.overrideReason && (
                  <span className="block text-[11px] text-amber-400 font-medium tracking-tight">
                    Override (was ${(item.originalPrice * item.qty).toFixed(2)})
                  </span>
                )}
                {item.requestedAmountCents !== undefined ? (
                  <span role="status" className="block text-[11px] text-amber-400 font-medium tracking-tight">
                    Requested amount confirmed
                  </span>
                ) : null}
              </div>
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

        {discountAmountCents && discountAmountCents > 0 ? (
          <div className="mt-1 flex items-center justify-between text-base text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span>Discount{discountReason ? ` (${discountReason})` : ""}</span>
              {onClearDiscount && (
                <button
                  type="button"
                  onClick={onClearDiscount}
                  className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-red-400 transition"
                  aria-label="Remove discount"
                >
                  Remove
                </button>
              )}
            </span>
            <span>-${(discountAmountCents / 100).toFixed(2)}</span>
          </div>
        ) : onSetDiscount && items.length > 0 ? (
          <div className="mt-2">
            {!showDiscountInput ? (
              <button
                type="button"
                onClick={() => setShowDiscountInput(true)}
                className="text-xs font-semibold text-accent hover:text-accent/80 transition flex items-center gap-1"
                aria-label="Add discount"
              >
                + Add Discount
              </button>
            ) : (
              <div className="mt-2 rounded-lg border border-white/10 bg-black/60 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Custom Discount ($)</span>
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="text-muted-foreground hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-24 rounded border border-white/20 bg-black px-2 py-1 text-sm text-white focus:border-accent focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={discountReasonInput}
                    onChange={(e) => setDiscountReasonInput(e.target.value)}
                    className="flex-1 min-w-0 rounded border border-white/20 bg-black px-2 py-1 text-sm text-white focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = parseFloat(discountValue);
                      if (!isNaN(num) && num > 0) {
                        onSetDiscount(Math.round(num * 100), discountReasonInput.trim() || undefined);
                        setShowDiscountInput(false);
                        setDiscountValue("");
                        setDiscountReasonInput("");
                      }
                    }}
                    className="rounded bg-accent px-3 py-1 text-xs font-semibold text-black hover:bg-accent/90 transition"
                  >
                    Apply
                  </button>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {[5, 10, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDiscountValue(preset.toString())}
                      className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80 hover:bg-white/10"
                    >
                      ${preset}
                    </button>
                  ))}
                  {[10, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const calculated = Math.round((subtotal * pct) / 100 * 100) / 100;
                        setDiscountValue(calculated.toFixed(2));
                        setDiscountReasonInput(`${pct}% off`);
                      }}
                      className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80 hover:bg-white/10"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between text-2xl font-bold">
          <span>Total</span>
          <span className="text-accent">${total.toFixed(2)}</span>
        </div>
      </div>

      {overrideItem && onUpdatePrice && (
        <PriceOverrideModal
          open={Boolean(overrideItem)}
          onOpenChange={(open) => !open && setOverrideItem(null)}
          productName={overrideItem.name}
          currentPrice={overrideItem.unitPrice}
          managerPin={managerPin}
          onConfirm={(newPrice, reason) => {
            if (reason) {
              onUpdatePrice(overrideItem.id, newPrice, reason);
            }
            setOverrideItem(null);
          }}
        />
      )}
    </section>
  );
}
