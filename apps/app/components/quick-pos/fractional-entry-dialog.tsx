"use client";

import { formatQuantity } from "@/lib/number-format";
import { useEffect, useMemo, useState } from "react";
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

function parseRequestedAmountCents(input: string): number | undefined {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(input.trim());
  if (!match || (!match[1] && !match[2])) return undefined;
  const fraction = match[2] ?? "";
  const dollars = Number(match[1] || "0");
  if (!Number.isSafeInteger(dollars) || dollars > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return undefined;
  let cents = dollars * 100 + Number((fraction + "00").slice(0, 2));
  if ((fraction[2] ?? "0") >= "5") cents += 1;
  return cents > 0 && Number.isSafeInteger(cents) ? cents : undefined;
}

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
  const [quantityEdit, setQuantityEdit] = useState("");
  const config = product?.commerce_config ?? product?.fractional_config;
  const canSuggestByDollars = config?.fractionalEnabled === true || (config?.suggestedDollarAmounts?.length ?? 0) > 0;
  useEffect(() => {
    if (!canSuggestByDollars) setMode("quantity");
  }, [canSuggestByDollars]);
  useEffect(() => {
    setValue("");
    setQuantityEdit("");
    setMode(canSuggestByDollars ? "dollars" : "quantity");
  }, [canSuggestByDollars, product?.id]);
  const numericValue = Number(value);
  const suggestedLine = useMemo(() => {
    if (!config || !Number.isFinite(numericValue) || numericValue <= 0) return null;
    return mode === "dollars"
      ? suggestQuantityForDollars(numericValue, config)
      : calculateFractionalLine(numericValue, config);
  }, [config, mode, numericValue]);
  const line = useMemo(() => {
    if (!config || !suggestedLine || !quantityEdit.trim()) return suggestedLine;
    const quantity = Number(quantityEdit);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    return calculateFractionalLine(quantity, config);
  }, [config, quantityEdit, suggestedLine]);
  const requestedAmountCents = mode === "dollars" && config?.fractionalEnabled
    ? parseRequestedAmountCents(value)
    : undefined;
  const priceVarianceCents = requestedAmountCents === undefined || !line
    ? 0
    : requestedAmountCents - Math.round(line.lineTotal * 100);

  const add = () => {
    if (!product || !config || !line || line.quantity <= 0 || (mode === "dollars" && config.fractionalEnabled && (!requestedAmountCents || requestedAmountCents <= 0))) return;
    const fractional = config.fractionalEnabled;
    onAdd({
      id: `inv:${product.id}:fractional:${Date.now()}`,
      inventoryId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unitPrice: fractional
        ? requestedAmountCents === undefined ? line.lineTotal : requestedAmountCents / 100
        : line.unitPrice,
      qty: fractional ? 1 : line.quantity,
      source: "inventory",
      weightGrams: fractional ? line.quantity : undefined,
      pricePerGram: fractional ? line.unitPrice : undefined,
      ...(requestedAmountCents === undefined ? {} : { requestedAmountCents }),
      bulkTierApplied: line.bulkTier?.label,
      commerceConfig: fractional ? undefined : config,
    });
    setValue("");
    setQuantityEdit("");
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
          {canSuggestByDollars ? (
            <Button type="button" variant={mode === "dollars" ? "default" : "outline"} onClick={() => { setMode("dollars"); setValue(""); setQuantityEdit(""); }}>
              Dollar amount
            </Button>
          ) : null}
          <Button type="button" variant={mode === "quantity" ? "default" : "outline"} onClick={() => { setMode("quantity"); setValue(""); setQuantityEdit(""); }}>
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
            onChange={(event) => { setValue(event.target.value); setQuantityEdit(""); }}
            autoFocus
          />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Suggested amounts">
          {(mode === "dollars"
            ? config?.suggestedDollarAmounts
            : config?.suggestedQuantities
            )?.map((preset) => (
            <Button key={preset} type="button" size="sm" variant="outline" onClick={() => { setValue(String(preset)); setQuantityEdit(""); }}>
              {mode === "dollars" ? `$${preset}` : `${preset}${config?.sellingUnit}`}
            </Button>
          ))}
        </div>

        {suggestedLine ? (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4" aria-live="polite">
            <div className="flex items-center justify-between">
              <span>{mode === "dollars" && quantityEdit ? "Confirmed quantity" : config?.fractionalEnabled ? "Suggested serving · edit to confirm" : "Suggested quantity"}</span>
              <strong>
                {line
                  ? config?.decimalPrecision !== undefined && config.decimalPrecision > 2
                    ? `${parseFloat(line.quantity.toFixed(config.decimalPrecision))} ${line.sellingUnit}`
                    : `${formatQuantity(line.quantity)} ${line.sellingUnit}`
                  : `${quantityEdit} ${suggestedLine.sellingUnit}`}
              </strong>
            </div>
            {mode === "dollars" ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor="fractional-confirmed-quantity">Confirmed quantity ({suggestedLine.sellingUnit})</Label>
                <Input
                  id="fractional-confirmed-quantity"
                  type="number"
                  inputMode="decimal"
                  min={config?.minimumSaleQuantity}
                  step={config?.quantityIncrement}
                  value={quantityEdit || String(suggestedLine.quantity)}
                  onChange={(event) => setQuantityEdit(event.target.value)}
                  onBlur={() => {
                    if (line) setQuantityEdit(String(line.quantity));
                  }}
                />
                {requestedAmountCents !== undefined ? (
                  <div className="flex items-center justify-between text-sm">
                    <span>Requested amount</span>
                    <strong>${(requestedAmountCents / 100).toFixed(2)}</strong>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">This amount suggests a quantity; the normal unit or bulk price applies.</p>
                )}
                {line && priceVarianceCents !== 0 ? (
                  <p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-200">
                    Difference from pre-loyalty normal price: ${line.lineTotal.toFixed(2)} at this quantity, {priceVarianceCents > 0 ? "+" : "−"}${(Math.abs(priceVarianceCents) / 100).toFixed(2)}. Checkout will keep the requested amount; its recorded adjustment reflects applied discounts.
                  </p>
                ) : null}
              </div>
            ) : null}
            {line ? <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>{line.bulkTier?.label ?? "Standard price"} · ${line.unitPrice.toFixed(2)}/{line.sellingUnit}</span>
              <span>${line.lineTotal.toFixed(2)}</span>
            </div> : null}
            {line && "belowMinimum" in line && line.belowMinimum ? (
              <p className="mt-2 text-sm text-destructive">Amount is below the minimum sellable increment.</p>
            ) : null}
          </div>
        ) : null}

        <Button type="button" className="h-12" onClick={add} disabled={!line || line.quantity <= 0 || (mode === "dollars" && config?.fractionalEnabled && (!requestedAmountCents || requestedAmountCents <= 0))}>
          {mode === "dollars" ? "Confirm amount and quantity" : "Add quantity"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
