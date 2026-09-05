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
          <Label htmlFor="create-dollar-presets">
            Suggested dollar amounts
          </Label>
          <Input
            id="create-dollar-presets"
            placeholder="10, 20, 50"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value);
              update({
                suggestedDollarAmounts: parsePresetInput(e.target.value),
              });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-quantity-presets">Suggested quantities</Label>
          <Input
            id="create-quantity-presets"
            placeholder={value.fractionalEnabled ? "0.5, 1, 3.5" : "1, 2, 3"}
            value={quantities}
            onChange={(e) => {
              setQuantities(e.target.value);
              update({ suggestedQuantities: parsePresetInput(e.target.value) });
            }}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Optional: enter up to eight comma-separated amounts. Checkout suggests
        the matching quantity for a dollar amount. Configure bulk tiers in
        Commerce & Delivery after creating the product.
      </p>
    </fieldset>
  );
}
