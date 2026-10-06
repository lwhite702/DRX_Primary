"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StepperInput } from "@/components/ui/stepper-input";
import { Plus, X } from "lucide-react";
import type { ProductCommerceConfig } from "@/lib/commerce/config";
import { commerceIssue, guidedCommerceProfile } from "@/lib/commerce/product-creation";
import {
  ALL_UNIT_OPTIONS,
  unitLabel,
  unitSymbol,
  type DRXUnit,
} from "@/lib/units/convert";

/** Friendly label for quantities (e.g. 0.125 oz -> ⅛ oz) */
function formatPresetLabel(val: number, unit: string): string {
  if (unit === "oz" || unit === "lb") {
    if (val === 0.125) return `⅛ ${unit}`;
    if (val === 0.25) return `¼ ${unit}`;
    if (val === 0.375) return `⅜ ${unit}`;
    if (val === 0.5) return `½ ${unit}`;
    if (val === 0.75) return `¾ ${unit}`;
  }
  return `${val} ${unit}`;
}

export function FractionalProductFields({
  value,
  onChange,
  basePrice = 0,
}: {
  value: ProductCommerceConfig;
  onChange: (value: ProductCommerceConfig) => void;
  basePrice?: number;
}) {
  const update = (patch: Partial<ProductCommerceConfig>) =>
    onChange({ ...value, ...patch });

  const currentUnit = (value.sellingUnit || "unit") as DRXUnit;

  // State for single-value custom adders
  const [showCustomDollar, setShowCustomDollar] = React.useState(false);
  const [customDollar, setCustomDollar] = React.useState<number>(25);
  const [showCustomQty, setShowCustomQty] = React.useState(false);
  const [customQty, setCustomQty] = React.useState<number>(
    value.minimumSaleQuantity || 1
  );
  const [quantityError, setQuantityError] = React.useState<string | null>(null);

  // Dollar Preset Packs
  const DOLLAR_PACKS: Array<{ label: string; values: number[] }> = [
    { label: "$10, $20, $50", values: [10, 20, 50] },
    { label: "$15, $30, $60", values: [15, 30, 60] },
    { label: "$20, $40, $80", values: [20, 40, 80] },
    { label: "$5, $10, $20", values: [5, 10, 20] },
  ];

  // Unit-aware Quantity Preset Packs
  const getQuantityPacks = (): Array<{ label: string; values: number[] }> => {
    if (!value.fractionalEnabled) return [
      { label: "1, 2, 5 units", values: [1, 2, 5] },
      { label: "1, 3, 6, 12 units", values: [1, 3, 6, 12] },
    ];
    if (currentUnit === "g") {
      return [
        { label: "1g, 3.5g (⅛), 7g (¼), 14g (½), 28g (1oz)", values: [1, 3.5, 7, 14, 28] },
        { label: "0.5g, 1g, 2g", values: [0.5, 1, 2] },
        { label: "1g, 2g, 5g, 10g", values: [1, 2, 5, 10] },
      ];
    }
    if (currentUnit === "oz") {
      return [
        { label: "⅛ oz, ¼ oz, ½ oz, 1 oz", values: [0.125, 0.25, 0.5, 1] },
        { label: "¼ oz, ½ oz, 1 oz, 2 oz", values: [0.25, 0.5, 1, 2] },
        { label: "½ oz, 1 oz, 2 oz", values: [0.5, 1, 2] },
      ];
    }
    if (currentUnit === "lb") {
      return [
        { label: "¼ lb, ½ lb, 1 lb", values: [0.25, 0.5, 1] },
        { label: "½ lb, 1 lb, 2 lb", values: [0.5, 1, 2] },
        { label: "1 lb, 2 lb, 5 lb", values: [1, 2, 5] },
      ];
    }
    return [
      { label: "1, 2, 5, 10 units", values: [1, 2, 5, 10] },
      { label: "1, 3, 6, 12 units", values: [1, 3, 6, 12] },
      { label: "2, 4, 8 units", values: [2, 4, 8] },
    ];
  };

  const handleSelectDollarPack = (packValues: number[]) => {
    update({ suggestedDollarAmounts: packValues });
  };

  const handleToggleDollar = (amount: number) => {
    const existing = value.suggestedDollarAmounts || [];
    if (existing.includes(amount)) {
      update({ suggestedDollarAmounts: existing.filter((a) => a !== amount) });
    } else {
      update({ suggestedDollarAmounts: [...existing, amount].sort((a, b) => a - b) });
    }
  };

  const handleAddCustomDollar = () => {
    if (customDollar > 0) {
      const existing = value.suggestedDollarAmounts || [];
      if (!existing.includes(customDollar)) {
        update({ suggestedDollarAmounts: [...existing, customDollar].sort((a, b) => a - b) });
      }
      setShowCustomDollar(false);
    }
  };

  const handleSelectQuantityPack = (packValues: number[]) => {
    update({ suggestedQuantities: packValues });
  };

  const handleToggleQuantity = (qty: number) => {
    const existing = value.suggestedQuantities || [];
    if (existing.includes(qty)) {
      update({ suggestedQuantities: existing.filter((q) => q !== qty) });
    } else {
      update({ suggestedQuantities: [...existing, qty].sort((a, b) => a - b) });
    }
  };

  const handleAddCustomQuantity = () => {
    if (customQty > 0) {
      const existing = value.suggestedQuantities || [];
      if (!existing.includes(customQty)) {
        const next = { ...value, suggestedQuantities: [...existing, customQty].sort((a, b) => a - b) };
        const issue = commerceIssue(next);
        if (issue) { setQuantityError(issue); return; }
        onChange(next);
      }
      setQuantityError(null);
      setShowCustomQty(false);
    }
  };

  return (
    <fieldset className="space-y-5 rounded-xl border border-white/20 bg-black/30 p-4">
      <legend className="px-2 font-semibold text-white">How This Product Is Sold</legend>

      {/* Selling Unit Selection */}
      <div className="space-y-2">
        <Label htmlFor="create-selling-unit" className="text-white font-medium">
          Selling Unit
        </Label>
        <select
          id="create-selling-unit"
          className="h-11 w-full rounded-lg border border-white/30 bg-[#222] px-3.5 py-2 text-base text-white shadow-xs outline-none transition-colors hover:border-white/50 focus:border-accent focus:ring-2 focus:ring-accent/40 md:text-sm"
          value={value.sellingUnit}
          onChange={(event) => {
            const nextUnit = event.target.value as DRXUnit;
            onChange({ ...guidedCommerceProfile(nextUnit, value.fractionalEnabled),
              suggestedDollarAmounts: value.suggestedDollarAmounts });
          }}
        >
          {ALL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-secondary">
          Stock counts, low stock alerts, and checkout amounts will be measured in {unitLabel(currentUnit, true)}.
        </p>
      </div>

      {/* Fractional / Weight Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <div className="space-y-0.5 pr-4">
          <Label htmlFor="create-fractional" className="text-sm font-medium text-white cursor-pointer">
            Sell by weight or fractional amounts
          </Label>
          <p className="text-xs text-text-secondary">
            Allow selling parts of a {unitLabel(currentUnit)} (e.g. 0.5 {unitSymbol(currentUnit)} or ⅛ {unitSymbol(currentUnit)}). Turn off for discrete whole items.
          </p>
        </div>
        <Switch
          id="create-fractional"
          checked={value.fractionalEnabled}
          onCheckedChange={(enabled) => {
            onChange({
              ...guidedCommerceProfile(value.sellingUnit, enabled),
              suggestedDollarAmounts: value.suggestedDollarAmounts.length > 0 ? value.suggestedDollarAmounts : [10, 20, 50],
            });
          }}
        />
      </div>

      {/* Steppers for Fractional Precision & Increments */}
      {value.fractionalEnabled && (
        <details className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <summary className="cursor-pointer text-sm text-white">Custom selling rules</summary>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white">Decimal Precision</Label>
              <StepperInput
                id="create-precision"
                min={1}
                max={6}
                step={1}
                value={value.decimalPrecision}
                onChange={(val) => update({ decimalPrecision: val })}
                aria-label="Decimal places"
              />
              <span className="text-[11px] text-text-secondary">e.g. 2 for 0.25</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white">Smallest Sale Amount</Label>
              <StepperInput
                id="create-minimum"
                min={0.0001}
                step={value.quantityIncrement || (currentUnit === "oz" ? 0.125 : 0.5)}
                unit={unitSymbol(currentUnit)}
                value={value.minimumSaleQuantity}
                onChange={(val) => update({ minimumSaleQuantity: val })}
                aria-label="Minimum sale amount"
              />
              <span className="text-[11px] text-text-secondary">Minimum customer can buy</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white">Step Size</Label>
              <StepperInput
                id="create-increment"
                min={0.0001}
                step={value.quantityIncrement || (currentUnit === "oz" ? 0.125 : 0.5)}
                unit={unitSymbol(currentUnit)}
                value={value.quantityIncrement}
                onChange={(val) => update({ quantityIncrement: val })}
                aria-label="Step size increment"
              />
              <span className="text-[11px] text-text-secondary">Increment between options</span>
            </div>
          </div>
        </details>
      )}

      {commerceIssue(value) && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
        <p>{commerceIssue(value)}</p>
        <button type="button" className="rounded-md border border-white/30 px-3 py-2 text-white" onClick={() => onChange({ ...guidedCommerceProfile(value.sellingUnit, value.fractionalEnabled), suggestedDollarAmounts: value.suggestedDollarAmounts })}>Use recommended rules</button>
      </div>}

      {/* Quick-Tap Register Presets Section */}
      <div className="space-y-4 pt-1">
        <div>
          <h4 className="text-sm font-semibold text-white">Quick-Tap Register Buttons</h4>
          <p className="text-xs text-text-secondary">
            Pre-configured one-tap buttons on your checkout register so staff don&apos;t have to type common amounts.
          </p>
        </div>

        {/* 1. Suggested Dollar Presets */}
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wider text-accent">
              Quick Dollar Amounts ($)
            </Label>
            <button
              type="button"
              onClick={() => setShowCustomDollar(!showCustomDollar)}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus className="h-3 w-3" />
              {showCustomDollar ? "Cancel" : "Add custom $"}
            </button>
          </div>

          {/* Preset Pack Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">Packs:</span>
            {DOLLAR_PACKS.map((pack, idx) => {
              const isSelected =
                value.suggestedDollarAmounts &&
                value.suggestedDollarAmounts.length === pack.values.length &&
                pack.values.every((v) => value.suggestedDollarAmounts.includes(v));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDollarPack(pack.values)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-accent text-black font-semibold ring-2 ring-accent"
                      : "border border-white/15 bg-white/5 text-white/90 hover:bg-white/15"
                  }`}
                >
                  {pack.label}
                </button>
              );
            })}
          </div>

          {/* Active Selected Dollar Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-text-secondary">Active buttons:</span>
            {(!value.suggestedDollarAmounts || value.suggestedDollarAmounts.length === 0) ? (
              <span className="text-xs italic text-muted-foreground">None selected</span>
            ) : (
              value.suggestedDollarAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleToggleDollar(amt)}
                  className="group flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive"
                  title="Click to remove"
                >
                  <span>${amt}</span>
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))
            )}
          </div>

          {/* Custom Dollar Adder */}
          {showCustomDollar && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-xs text-white">Amount ($):</span>
              <div className="w-36">
                <StepperInput
                  min={1}
                  step={5}
                  value={customDollar}
                  onChange={setCustomDollar}
                  unit="$"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomDollar}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-black hover:bg-accent/90"
              >
                Add ${customDollar}
              </button>
            </div>
          )}
        </div>

        {/* 2. Suggested Quantity Presets */}
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wider text-accent">
              Quick Quantities ({unitSymbol(currentUnit)})
            </Label>
            <button
              type="button"
              onClick={() => setShowCustomQty(!showCustomQty)}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Plus className="h-3 w-3" />
              {showCustomQty ? "Cancel" : "Add custom quantity"}
            </button>
          </div>

          {/* Preset Pack Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">Packs:</span>
            {getQuantityPacks().map((pack, idx) => {
              const isSelected =
                value.suggestedQuantities &&
                value.suggestedQuantities.length === pack.values.length &&
                pack.values.every((v) => value.suggestedQuantities.includes(v));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuantityPack(pack.values)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-accent text-black font-semibold ring-2 ring-accent"
                      : "border border-white/15 bg-white/5 text-white/90 hover:bg-white/15"
                  }`}
                >
                  {pack.label}
                </button>
              );
            })}
          </div>

          {/* Active Selected Quantity Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-text-secondary">Active buttons:</span>
            {(!value.suggestedQuantities || value.suggestedQuantities.length === 0) ? (
              <span className="text-xs italic text-muted-foreground">None selected</span>
            ) : (
              value.suggestedQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleToggleQuantity(qty)}
                  className="group flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive"
                  title="Click to remove"
                >
                  <span>{formatPresetLabel(qty, unitSymbol(currentUnit))}</span>
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))
            )}
          </div>

          {/* Custom Quantity Adder */}
          {showCustomQty && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-xs text-white">Quantity:</span>
              <div className="w-36">
                <StepperInput
                  min={0.01}
                  step={value.quantityIncrement || 0.5}
                  value={customQty}
                  onChange={setCustomQty}
                  unit={unitSymbol(currentUnit)}
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomQuantity}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-black hover:bg-accent/90"
              >
                Add {customQty} {unitSymbol(currentUnit)}
              </button>
              {quantityError && <p role="alert" className="text-xs text-destructive">{quantityError}</p>}
            </div>
          )}
        </div>
      </div>
      <details className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <summary className="cursor-pointer text-sm font-semibold text-white">Advanced: bulk and bundle prices</summary>
        <p className="mt-2 text-xs text-text-secondary">Set the total at each quantity. For example, with a $35/g base price: 2g for $60, 3.5g for $90, and 7g for $140. The highest eligible price applies to the full sale quantity.</p>
        <div className="mt-3 space-y-3">
          {value.bulkPriceTiers.map((tier, index) => (
            <div key={tier.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div><Label htmlFor={`bundle-quantity-${tier.id}`} className="text-xs text-white">Quantity ({value.sellingUnit})</Label>
                <input id={`bundle-quantity-${tier.id}`} aria-label={`Bundle ${index + 1} quantity`} type="number" min={value.minimumSaleQuantity} step={value.quantityIncrement} value={tier.minimumQuantity || ""} onChange={(event) => {
                  const minimumQuantity = Number(event.target.value);
                  update({ bulkPriceTiers: value.bulkPriceTiers.map(item => item.id === tier.id ? { ...item, minimumQuantity, unitPrice: minimumQuantity > 0 ? (item.totalPrice ?? 0) / minimumQuantity : 0, label: `${minimumQuantity}+` } : item) });
                }} className="h-10 w-full rounded-md border border-white/30 bg-[#222] px-2 text-white" /></div>
              <div><Label htmlFor={`bundle-total-${tier.id}`} className="text-xs text-white">Total price ($)</Label>
                <input id={`bundle-total-${tier.id}`} aria-label={`Bundle ${index + 1} total price`} type="number" min="0.01" step="0.01" value={tier.totalPrice ?? ""} onChange={(event) => {
                  const totalPrice = Number(event.target.value);
                  update({ bulkPriceTiers: value.bulkPriceTiers.map(item => item.id === tier.id ? { ...item, totalPrice, unitPrice: item.minimumQuantity > 0 ? totalPrice / item.minimumQuantity : 0 } : item) });
                }} className="h-10 w-full rounded-md border border-white/30 bg-[#222] px-2 text-white" /></div>
              <button type="button" aria-label={`Remove bundle ${index + 1}`} onClick={() => update({ bulkPriceTiers: value.bulkPriceTiers.filter(item => item.id !== tier.id) })} className="h-10 rounded-md border border-white/30 px-3 text-white">Remove</button>
            </div>
          ))}
          <button type="button" disabled={value.bulkPriceTiers.length >= 12} onClick={() => {
            const previous = value.bulkPriceTiers.at(-1)?.minimumQuantity ?? value.minimumSaleQuantity;
            const minimumQuantity = Number((previous + value.quantityIncrement).toFixed(value.decimalPrecision));
            const totalPrice = Number((minimumQuantity * basePrice).toFixed(2));
            update({ bulkPriceTiers: [...value.bulkPriceTiers, { id: crypto.randomUUID(), label: `${minimumQuantity}+`, minimumQuantity, unitPrice: basePrice, totalPrice }] });
          }} className="rounded-md border border-white/30 px-3 py-2 text-sm text-white disabled:opacity-40">Add bundle price</button>
        </div>
      </details>
    </fieldset>
  );
}
