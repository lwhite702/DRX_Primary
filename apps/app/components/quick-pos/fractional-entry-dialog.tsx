"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateFractionalLine,
  suggestQuantityForDollars,
} from "@/lib/quick-pos/commerce";
import type { QuickPosBootstrapItem, QuickPosCartItem } from "@/lib/quick-pos/types";

export function FractionalEntryDialog({
  product,
  onClose,
  onAdd,
}: {
  product: QuickPosBootstrapItem | null;
  onClose: () => void;
  onAdd: (item: QuickPosCartItem) => void;
}) {
  const [mode, setMode] = useState<"dollars" | "quantity">("dollars");
  const [value, setValue] = useState("");
  const config = product?.commerce_config ?? product?.fractional_config;
  const numericValue = Number(value);
  const line = useMemo(() => {
    if (!config || !Number.isFinite(numericValue) || numericValue <= 0) return null;
    return mode === "dollars"
      ? suggestQuantityForDollars(numericValue, config)
      : calculateFractionalLine(numericValue, config);
  }, [config, mode, numericValue]);

  const add = () => {
    if (!product || !config || !line || line.quantity <= 0) return;
    const fractional = config.fractionalEnabled;
    onAdd({
      id: `inv:${product.id}:fractional:${Date.now()}`,
      inventoryId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unitPrice: fractional ? line.lineTotal : line.unitPrice,
      qty: fractional ? 1 : line.quantity,
      source: "inventory",
      weightGrams: fractional ? line.quantity : undefined,
      pricePerGram: fractional ? line.unitPrice : undefined,
      bulkTierApplied: line.bulkTier?.label,
      commerceConfig: fractional ? undefined : config,
    });
    setValue("");
    onClose();
  };

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {product?.name}</DialogTitle>
          <DialogDescription>
            Enter a dollar value to suggest a serving or unit amount, or enter the quantity.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Entry mode">
          <Button type="button" variant={mode === "dollars" ? "default" : "outline"} onClick={() => { setMode("dollars"); setValue(""); }}>
            Dollar amount
          </Button>
          <Button type="button" variant={mode === "quantity" ? "default" : "outline"} onClick={() => { setMode("quantity"); setValue(""); }}>
            Quantity
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fractional-value">
            {mode === "dollars" ? "Dollar amount" : `Quantity (${config?.sellingUnit ?? "unit"})`}
          </Label>
          <Input
            id="fractional-value"
            type="number"
            inputMode="decimal"
            min={mode === "quantity" ? config?.minimumSaleQuantity : 0.01}
            step={mode === "quantity" ? config?.quantityIncrement : 0.01}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Suggested amounts">
          {(mode === "dollars"
            ? config?.suggestedDollarAmounts
            : config?.suggestedQuantities
          )?.map((preset) => (
            <Button key={preset} type="button" size="sm" variant="outline" onClick={() => setValue(String(preset))}>
              {mode === "dollars" ? `$${preset}` : `${preset}${config?.sellingUnit}`}
            </Button>
          ))}
        </div>

        {line ? (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4" aria-live="polite">
            <div className="flex items-center justify-between">
              <span>{config?.fractionalEnabled ? "Suggested serving" : "Suggested quantity"}</span>
              <strong>{line.quantity} {line.sellingUnit}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>{line.bulkTier?.label ?? "Standard price"} · ${line.unitPrice.toFixed(4)}/{line.sellingUnit}</span>
              <span>${line.lineTotal.toFixed(2)}</span>
            </div>
            {"belowMinimum" in line && line.belowMinimum ? (
              <p className="mt-2 text-sm text-destructive">Amount is below the minimum sellable increment.</p>
            ) : null}
          </div>
        ) : null}

        <Button type="button" className="h-12" onClick={add} disabled={!line || line.quantity <= 0}>
          Add suggested amount
        </Button>
      </DialogContent>
    </Dialog>
  );
}
