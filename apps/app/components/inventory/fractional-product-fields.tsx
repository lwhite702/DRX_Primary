"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProductCommerceConfig } from "@/lib/commerce/config";
import {
  creationCommerceDefaults,
  parsePresetInput,
} from "@/lib/commerce/product-creation";

export function FractionalProductFields({
  value,
  onChange,
}: {
  value: ProductCommerceConfig;
  onChange: (value: ProductCommerceConfig) => void;
}) {
  const [dollars, setDollars] = React.useState(
    value.suggestedDollarAmounts.join(", "),
  );
  const [quantities, setQuantities] = React.useState(
    value.suggestedQuantities.join(", "),
  );
  const update = (patch: Partial<ProductCommerceConfig>) =>
    onChange({ ...value, ...patch });
  return (
    <fieldset className="space-y-4 rounded-xl border border-white/20 p-4">
      <legend className="px-2 font-semibold">How this product is sold</legend>
      <div className="flex items-center gap-3">
        <Switch
          id="create-fractional"
          checked={value.fractionalEnabled}
          onCheckedChange={(enabled) => {
            onChange({
              ...creationCommerceDefaults(value.sellingUnit, enabled),
              suggestedDollarAmounts: value.suggestedDollarAmounts,
            });
            setQuantities("");
          }}
        />
        <Label htmlFor="create-fractional">Allow fractional sales</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Sell part of a unit, such as 0.5 g. The selling price and cost above are
        for one full selling unit. This applies only to this product.
      </p>
      <div className="space-y-2">
        <Label htmlFor="create-selling-unit">Selling unit</Label>
        <select
          id="create-selling-unit"
          className="input w-full rounded-md border bg-background p-2"
          value={value.sellingUnit}
          onChange={(event) => update({ sellingUnit: event.target.value })}
        >
          {[
            ["unit", "Unit"],
            ["g", "Gram (g)"],
            ["oz", "Ounce (oz)"],
            ["lb", "Pound (lb)"],
            ["ml", "Milliliter (ml)"],
            ["L", "Liter (L)"],
          ].map(([unit, label]) => (
            <option key={unit} value={unit}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {value.fractionalEnabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="create-precision">Decimal places</Label>
              <Input
                id="create-precision"
                type="number"
                min={1}
                max={6}
                step={1}
                value={value.decimalPrecision}
                onChange={(e) =>
                  update({ decimalPrecision: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-minimum">Minimum sale quantity</Label>
              <Input
                id="create-minimum"
                type="number"
                min={0}
                step="any"
                value={value.minimumSaleQuantity}
                onChange={(e) =>
                  update({ minimumSaleQuantity: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-increment">Quantity increment</Label>
              <Input
                id="create-increment"
                type="number"
                min={0}
                step="any"
                value={value.quantityIncrement}
                onChange={(e) =>
                  update({ quantityIncrement: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Start at the minimum, then add increments. For example, a 0.5
            minimum and 0.25 increment allow 0.5, 0.75, and 1{" "}
            {value.sellingUnit}.
          </p>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="create-dollar-presets">
              Suggested dollar amounts
            </Label>
          </div>
          <Input
            id="create-dollar-presets"
            placeholder="e.g. 10, 20, 50"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value);
              update({
                suggestedDollarAmounts: parsePresetInput(e.target.value),
              });
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground">Quick presets:</span>
            {[
              [10, 20, 50],
              [15, 30, 60],
              [20, 40, 80],
            ].map((presetGroup, idx) => {
              const label = `$${presetGroup.join(", $")}`;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const str = presetGroup.join(", ");
                    setDollars(str);
                    update({ suggestedDollarAmounts: presetGroup });
                  }}
                  className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="create-quantity-presets">
              Suggested quantities
            </Label>
          </div>
          <Input
            id="create-quantity-presets"
            placeholder={value.fractionalEnabled ? "e.g. 0.5, 1, 3.5" : "e.g. 1, 2, 3"}
            value={quantities}
            onChange={(e) => {
              setQuantities(e.target.value);
              update({ suggestedQuantities: parsePresetInput(e.target.value) });
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground">Common:</span>
            {(value.fractionalEnabled && value.sellingUnit === "g"
              ? [
                  [1, 3.5, 7],
                  [0.5, 1, 2],
                  [3.5, 7, 14, 28],
                ]
              : [
                  [1, 2, 5],
                  [1, 3, 6],
                  [2, 4, 8],
                ]
            ).map((presetGroup, idx) => {
              const label = presetGroup.join(", ") + ` ${value.sellingUnit}`;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const str = presetGroup.join(", ");
                    setQuantities(str);
                    update({ suggestedQuantities: presetGroup });
                  }}
                  className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Quick-tap buttons created here will appear on your checkout register so staff can tap popular amounts with one touch.
      </p>
    </fieldset>
  );
}
