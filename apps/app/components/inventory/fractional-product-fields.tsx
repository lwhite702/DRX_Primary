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
import {
  ALL_UNIT_OPTIONS,
  unitLabel,
  unitSymbol,
  type DRXUnit,
} from "@/lib/units/convert";

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
  const currentUnit = (value.sellingUnit || "unit") as DRXUnit;

  return (
    <fieldset className="space-y-4 rounded-xl border border-white/20 p-4">
      <legend className="px-2 font-semibold">How this product is sold</legend>

      <div className="space-y-2">
        <Label htmlFor="create-selling-unit">Selling unit</Label>
        <select
          id="create-selling-unit"
          className="input w-full rounded-md border bg-background p-2"
          value={value.sellingUnit}
          onChange={(event) => {
            const nextUnit = event.target.value;
            update({ sellingUnit: nextUnit });
          }}
        >
          {ALL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Stock counts, reorder thresholds, and register pricing will all be measured in {unitLabel(currentUnit, true)}.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
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
        Sell partial amounts of a {unitLabel(currentUnit)} (e.g. 0.5 {unitSymbol(currentUnit)}).
        The selling price and cost above are for one full {unitLabel(currentUnit)}.
      </p>
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
              const parsed = parsePresetInput(e.target.value).filter((n) => !Number.isNaN(n));
              update({
                suggestedDollarAmounts: parsed,
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
              const parsed = parsePresetInput(e.target.value).filter((n) => !Number.isNaN(n));
              update({ suggestedQuantities: parsed });
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground">Common:</span>
            {(() => {
              const unit = value.sellingUnit;
              let groups: number[][];
              if (value.fractionalEnabled && unit === "g") {
                groups = [[1, 3.5, 7], [0.5, 1, 2], [3.5, 7, 14, 28]];
              } else if (value.fractionalEnabled && unit === "oz") {
                // 1/8 oz, 1/4 oz, 1/2 oz, 1 oz
                groups = [[0.125, 0.25, 0.5], [0.25, 0.5, 1], [0.5, 1, 2]];
              } else if (value.fractionalEnabled && unit === "lb") {
                groups = [[0.25, 0.5, 1], [0.5, 1, 2], [1, 2, 5]];
              } else {
                groups = [[1, 2, 5], [1, 3, 6], [2, 4, 8]];
              }
              return groups.map((presetGroup, idx) => {
                const label = presetGroup.join(", ") + ` ${unit}`;
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
              });
            })()}
          </div>
          </div>
        </div>
      <p className="text-xs text-muted-foreground">
        Quick-tap buttons created here will appear on your checkout register so staff can tap popular amounts with one touch.
      </p>
    </fieldset>
  );
}
