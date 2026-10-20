"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DeliveryDispatchType, DeliveryFeeSplitMode, QuickPosDeliveryState } from "@/lib/quick-pos/types";

function computeCustomerShareCents(
  vendorFeeCents: number,
  splitMode: DeliveryFeeSplitMode,
  customCents?: number,
): number {
  const vendor = Math.max(0, vendorFeeCents || 0);
  if (splitMode === "pass_full") return vendor;
  if (splitMode === "absorb_full") return 0;
  if (splitMode === "split_half") return Math.round(vendor / 2);
  return Math.min(vendor, Math.max(0, customCents ?? 0));
}

export function DeliveryCheckout({
  delivery,
  onChange,
}: {
  delivery: QuickPosDeliveryState;
  onChange: (delivery: QuickPosDeliveryState) => void;
}) {
  const dispatchType: DeliveryDispatchType = delivery.dispatchType ?? "merchant_dispatch";
  const splitMode: DeliveryFeeSplitMode =
    delivery.feeSplitMode ??
    (delivery.feeAllocation === "absorb" ? "absorb_full" : "pass_full");

  const [feeInput, setFeeInput] = useState<string>(
    delivery.vendorFeeCents > 0 ? (delivery.vendorFeeCents / 100).toFixed(2) : "",
  );
  const [customShareInput, setCustomShareInput] = useState<string>(
    delivery.customerFeeCents !== undefined && delivery.customerFeeCents > 0
      ? (delivery.customerFeeCents / 100).toFixed(2)
      : "",
  );
  const [etaInput, setEtaInput] = useState<string>(
    delivery.estimatedArrivalMinutes ? String(delivery.estimatedArrivalMinutes) : "",
  );
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const currentCents = Math.max(0, Math.round(Number(feeInput || 0) * 100));
    if (currentCents !== delivery.vendorFeeCents) {
      setFeeInput(delivery.vendorFeeCents > 0 ? (delivery.vendorFeeCents / 100).toFixed(2) : "");
    }
  }, [delivery.vendorFeeCents]);

  const applyDeliveryUpdate = (patch: Partial<QuickPosDeliveryState>) => {
    const next = { ...delivery, ...patch };
    const mode: DeliveryFeeSplitMode =
      next.feeSplitMode ??
      (next.feeAllocation === "absorb" ? "absorb_full" : "pass_full");
    const customerCents = computeCustomerShareCents(
      next.vendorFeeCents,
      mode,
      next.customerFeeCents,
    );
    onChange({
      ...next,
      feeSplitMode: mode,
      customerFeeCents: customerCents,
      feeAllocation: customerCents > 0 ? "charge_customer" : "absorb",
    });
  };

  const handleFeeChange = (val: string) => {
    setFeeInput(val);
    const num = parseFloat(val);
    const vendorFeeCents = !isNaN(num) && num >= 0 ? Math.round(num * 100) : 0;
    applyDeliveryUpdate({ vendorFeeCents });
  };

  const handleCustomShareChange = (val: string) => {
    setCustomShareInput(val);
    const num = parseFloat(val);
    const rawCents = !isNaN(num) && num >= 0 ? Math.round(num * 100) : 0;
    const clampedCents = Math.min(delivery.vendorFeeCents || 0, rawCents);
    applyDeliveryUpdate({
      feeSplitMode: "custom",
      customerFeeCents: clampedCents,
    });
  };

  const handleEtaChange = (val: string) => {
    setEtaInput(val);
    const mins = parseInt(val, 10);
    applyDeliveryUpdate({
      estimatedArrivalMinutes: !isNaN(mins) && mins > 0 ? Math.min(1440, mins) : undefined,
    });
  };

  const customerPaysCents = computeCustomerShareCents(
    delivery.vendorFeeCents,
    splitMode,
    delivery.customerFeeCents,
  );
  const merchantAbsorbsCents = Math.max(0, (delivery.vendorFeeCents || 0) - customerPaysCents);

  return (
    <section
      className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
      aria-labelledby="delivery-checkout-title"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="delivery-checkout-title" className="text-lg font-semibold">
            Delivery &amp; Courier
          </h2>
          <p className="text-sm text-white/60">
            Configure Uber/courier cost, fee split, pickup vs. dispatch, ETA, and tracking link.
          </p>
        </div>
        <Switch
          checked={delivery.enabled}
          onCheckedChange={(enabled) => onChange({ ...delivery, enabled })}
          aria-label="Include delivery"
        />
      </div>

      {delivery.enabled ? (
        <div className="space-y-4">
          {/* Who sends the car? */}
          <div className="space-y-2">
            <Label>Who is sending the car?</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => applyDeliveryUpdate({ dispatchType: "merchant_dispatch" })}
                className={
                  "rounded-lg border p-3 text-left transition " +
                  (dispatchType === "merchant_dispatch"
                    ? "border-accent bg-accent/15 text-white"
                    : "border-white/10 bg-black/40 text-white/70 hover:border-white/25")
                }
              >
                <span className="block text-sm font-bold">We Send Car (Merchant Dispatch)</span>
                <span className="block text-xs text-white/60">
                  Store dispatches Uber/courier to the customer&apos;s address
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyDeliveryUpdate({ dispatchType: "customer_pickup_car" })}
                className={
                  "rounded-lg border p-3 text-left transition " +
                  (dispatchType === "customer_pickup_car"
                    ? "border-accent bg-accent/15 text-white"
                    : "border-white/10 bg-black/40 text-white/70 hover:border-white/25")
                }
              >
                <span className="block text-sm font-bold">Customer Sends Car to Pickup</span>
                <span className="block text-xs text-white/60">
                  Customer dispatches Uber/courier for curbside pickup
                </span>
              </button>
            </div>
          </div>

          {/* Address / Curbside notes */}
          <div className="space-y-2">
            <Label htmlFor="delivery-address">
              {dispatchType === "customer_pickup_car"
                ? "Pickup / Vehicle Notes (Optional)"
                : "Delivery address"}
            </Label>
            <Input
              id="delivery-address"
              autoComplete="street-address"
              value={delivery.address}
              onChange={(event) =>
                onChange({ ...delivery, address: event.target.value })
              }
              placeholder={
                dispatchType === "customer_pickup_car"
                  ? "Optional vehicle description, driver name, or pickup note"
                  : "Street, city, state, ZIP"
              }
            />
            <p className="text-xs text-white/60">
              {dispatchType === "customer_pickup_car"
                ? "Destination address is not required when customer sends car for pickup."
                : "Encrypted by the server before storage."}
            </p>
          </div>

          {/* Uber / Vendor Quote + ETA */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-delivery-fee">Uber / Courier Amount ($)</Label>
              <Input
                id="vendor-delivery-fee"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={feeInput}
                onChange={(event) => handleFeeChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-eta-minutes">Estimated Arrival Time (Minutes)</Label>
              <div className="space-y-1.5">
                <Input
                  id="delivery-eta-minutes"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1440"
                  placeholder="e.g. 25"
                  value={etaInput}
                  onChange={(event) => handleEtaChange(event.target.value)}
                />
                <div className="flex gap-1.5">
                  {[15, 25, 35, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleEtaChange(String(mins))}
                      className={
                        "rounded border px-2 py-0.5 text-xs font-medium transition " +
                        (delivery.estimatedArrivalMinutes === mins
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10")
                      }
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4-Way Cost Split */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How should the Uber cost be handled?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="delivery-allocation"
                  value="charge_customer"
                  checked={splitMode === "pass_full"}
                  onChange={() => applyDeliveryUpdate({ feeSplitMode: "pass_full" })}
                />
                <span>
                  <strong>Pass 100% to customer</strong>
                  <span className="block text-xs text-white/60">
                    Customer pays full ${(delivery.vendorFeeCents / 100).toFixed(2)} fee
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="delivery-allocation"
                  value="absorb"
                  checked={splitMode === "absorb_full"}
                  onChange={() => applyDeliveryUpdate({ feeSplitMode: "absorb_full" })}
                />
                <span>
                  <strong>Pass 0% (Business absorbs)</strong>
                  <span className="block text-xs text-white/60">
                    Customer pays $0.00; store absorbs ${(delivery.vendorFeeCents / 100).toFixed(2)}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="delivery-allocation"
                  value="split_half"
                  checked={splitMode === "split_half"}
                  onChange={() => applyDeliveryUpdate({ feeSplitMode: "split_half" })}
                />
                <span>
                  <strong>Split 50 / 50</strong>
                  <span className="block text-xs text-white/60">
                    Customer pays ${(Math.round(delivery.vendorFeeCents / 2) / 100).toFixed(2)} • Store absorbs ${(Math.max(0, delivery.vendorFeeCents - Math.round(delivery.vendorFeeCents / 2)) / 100).toFixed(2)}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="delivery-allocation"
                  value="custom"
                  checked={splitMode === "custom"}
                  onChange={() => {
                    const defaultCustom = delivery.customerFeeCents ?? Math.round(delivery.vendorFeeCents / 2);
                    setCustomShareInput((defaultCustom / 100).toFixed(2));
                    applyDeliveryUpdate({
                      feeSplitMode: "custom",
                      customerFeeCents: defaultCustom,
                    });
                  }}
                />
                <span>
                  <strong>Pass part (Custom $)</strong>
                  <span className="block text-xs text-white/60">
                    Enter exact dollar amount passed to customer
                  </span>
                </span>
              </label>
            </div>

            {splitMode === "custom" && (
              <div className="mt-2 rounded-lg border border-accent/30 bg-black/50 p-3 space-y-2">
                <Label htmlFor="custom-customer-delivery-fee" className="text-xs">
                  Amount passed to customer ($)
                </Label>
                <Input
                  id="custom-customer-delivery-fee"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={(delivery.vendorFeeCents / 100).toFixed(2)}
                  step="0.01"
                  placeholder="0.00"
                  value={customShareInput}
                  onChange={(e) => handleCustomShareChange(e.target.value)}
                />
              </div>
            )}

            {delivery.vendorFeeCents > 0 && (
              <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80">
                <span>
                  Customer charged: <strong className="text-emerald-300">${(customerPaysCents / 100).toFixed(2)}</strong>
                </span>
                <span>
                  Store expense absorbed: <strong className="text-amber-300">${(merchantAbsorbsCents / 100).toFixed(2)}</strong>
                </span>
              </div>
            )}
          </fieldset>

          {/* Uber Tracking Link */}
          <div className="space-y-2">
            <Label htmlFor="uber-tracking-url">Uber Tracking Link (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="uber-tracking-url"
                type="url"
                placeholder="https://m.uber.com/ul/... or tracking URL"
                value={delivery.uberTrackingUrl ?? ""}
                onChange={(e) =>
                  applyDeliveryUpdate({ uberTrackingUrl: e.target.value })
                }
                className="flex-1"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const clip = await navigator.clipboard.readText();
                    if (clip) applyDeliveryUpdate({ uberTrackingUrl: clip.trim() });
                  } catch {
                    // Clipboard read permission denied or unavailable
                  }
                }}
                className="h-10 rounded-md border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Paste
              </button>
              {delivery.uberTrackingUrl?.trim() ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(delivery.uberTrackingUrl!.trim());
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 1800);
                      } catch {
                        // Ignore clipboard errors
                      }
                    }}
                    className="h-10 rounded-md border border-accent/40 bg-accent/15 px-3 text-xs font-semibold text-accent hover:bg-accent/25 transition"
                  >
                    {copiedLink ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={delivery.uberTrackingUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-md border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10 transition"
                  >
                    Open
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
