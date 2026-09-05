"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { QuickPosDeliveryState } from "@/lib/quick-pos/types";

export function DeliveryCheckout({
  delivery,
  onChange,
}: {
  delivery: QuickPosDeliveryState;
  onChange: (delivery: QuickPosDeliveryState) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-labelledby="delivery-checkout-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="delivery-checkout-title" className="text-lg font-semibold">Delivery</h2>
          <p className="text-sm text-white/60">Create a tracked dispatch task after checkout.</p>
        </div>
        <Switch
          checked={delivery.enabled}
          onCheckedChange={(enabled) => onChange({ ...delivery, enabled })}
          aria-label="Include delivery"
        />
      </div>

      {delivery.enabled ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delivery-address">Delivery address</Label>
            <Input
              id="delivery-address"
              autoComplete="street-address"
              value={delivery.address}
              onChange={(event) => onChange({ ...delivery, address: event.target.value })}
              placeholder="Street, city, state, ZIP"
            />
            <p className="text-xs text-white/60">Encrypted by the server before storage.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-delivery-fee">Uber/vendor quote</Label>
            <Input
              id="vendor-delivery-fee"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={(delivery.vendorFeeCents / 100).toFixed(2)}
              onChange={(event) =>
                onChange({
                  ...delivery,
                  vendorFeeCents: Math.max(0, Math.round(Number(event.target.value || 0) * 100)),
                })
              }
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Who pays the vendor fee?</legend>
            <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
              <input type="radio" name="delivery-allocation" value="charge_customer" checked={delivery.feeAllocation === "charge_customer"} onChange={() => onChange({ ...delivery, feeAllocation: "charge_customer" })} />
              <span><strong>Charge customer</strong><span className="block text-sm text-white/60">Adds the quoted fee{delivery.feeTaxable ? " and configured tax" : ""} to checkout.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
              <input type="radio" name="delivery-allocation" value="absorb" checked={delivery.feeAllocation === "absorb"} onChange={() => onChange({ ...delivery, feeAllocation: "absorb" })} />
              <span><strong>Business absorbs</strong><span className="block text-sm text-white/60">Customer pays $0; the vendor fee remains an expense in profit reporting.</span></span>
            </label>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
