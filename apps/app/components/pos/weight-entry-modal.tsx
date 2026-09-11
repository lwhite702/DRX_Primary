"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { quoteWeight } from "@/lib/pos/weight-quote-client";
import { aliasWeightGrams, loadUnitAliases, type UnitAlias } from "@/lib/inventory/unit-aliases-client";
import { formatQuantity } from "@/lib/number-format";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface WeightEntryModalProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    product_name: string;
    sku: string;
    base_unit?: string;
    inventory_in_grams?: number;
    price_per_gram?: number;
  } | null;
  businessId: string;
  onAddToCart?: (item: {
    inventory_id: string;
    product_name: string;
    sku: string;
    weight_grams: number;
    unit_price: number;
    price_per_gram?: number;
    bulk_tier_applied?: string;
    line_total: number;
  }) => void;
}

export function WeightEntryModal({
  open,
  onClose,
  product,
  businessId,
  onAddToCart,
}: WeightEntryModalProps) {
  const [weightGrams, setWeightGrams] = useState("");
  const [pricePerGram, setPricePerGram] = useState<number | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [aliases, setAliases] = useState<UnitAlias[]>([]);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [quoteKey, setQuoteKey] = useState<string>();
  const [pricingError, setPricingError] = useState<string>();
  const currentQuoteKey = JSON.stringify([businessId, product?.id, weightGrams]);
  const quoteReady = open && quoteKey === currentQuoteKey && pricePerGram !== null;
  const [aliasBusiness, setAliasBusiness] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setQuoteKey(undefined); setPricePerGram(null); setTierName(null); setTotalPrice(0); setPricingError(undefined);
    const weight = Number(weightGrams);
    if (!open || !product || !businessId || !weightGrams.trim() || !Number.isFinite(weight) || weight <= 0) return () => controller.abort();
    quoteWeight(businessId, product.id, weight, controller.signal).then(pricing => {
      if (controller.signal.aborted) return;
      setPricePerGram(pricing.price_per_gram); setTierName(pricing.tier_name ?? null); setTotalPrice(pricing.total_price); setQuoteKey(currentQuoteKey);
    }).catch(() => { if (!controller.signal.aborted) setPricingError("Weight pricing is unavailable. Change the weight or reopen to retry."); });
    return () => controller.abort();
  }, [open, product?.id, businessId, weightGrams, currentQuoteKey]);

  useEffect(() => {
    const controller = new AbortController(); setAliases([]); setAliasBusiness(undefined);
    if (!open || !businessId) { setLoadingAliases(false); return () => controller.abort(); }
    setLoadingAliases(true);
    loadUnitAliases(businessId, controller.signal).then(rows => {
      if (!controller.signal.aborted) { setAliases(rows.filter(row => row.is_enabled).sort((a, b) => aliasWeightGrams(a) - aliasWeightGrams(b))); setAliasBusiness(businessId); }
    }).catch(() => { if (!controller.signal.aborted) toast.error("Failed to load unit aliases"); })
      .finally(() => { if (!controller.signal.aborted) setLoadingAliases(false); });
    return () => controller.abort();
  }, [open, businessId]);

  const handleAddToCart = () => {
    if (!product) {
      toast.error("No product selected");
      return;
    }

    if (!weightGrams || parseFloat(weightGrams) <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    if (!quoteReady || pricePerGram === null) {
      toast.error("Failed to calculate price");
      return;
    }

    if (
      product.inventory_in_grams !== undefined &&
      parseFloat(weightGrams) > product.inventory_in_grams
    ) {
      toast.error(
        `Insufficient weight. Available: ${product.inventory_in_grams.toFixed(2)}g`,
      );
      return;
    }

    setProcessing(true);

    try {
      onAddToCart?.({
        inventory_id: product.id,
        product_name: product.product_name,
        sku: product.sku,
        weight_grams: parseFloat(weightGrams),
        unit_price: totalPrice,
        price_per_gram: pricePerGram,
        bulk_tier_applied: tierName || undefined,
        line_total: totalPrice,
      });

      toast.success(`${product.product_name} added to cart`);
      setWeightGrams("");
      setPricePerGram(null);
      setTierName(null);
      setTotalPrice(0);
      onClose();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    } finally {
      setProcessing(false);
    }
  };

  const weight = weightGrams ? parseFloat(weightGrams) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {product?.product_name}</DialogTitle>
          <DialogDescription>
            Enter the weight to calculate price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{product?.product_name}</p>
              <p className="text-xs text-muted-foreground">
                SKU: {product?.sku}
              </p>
            </div>
            {product?.inventory_in_grams && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="font-medium">
                  {product.inventory_in_grams.toFixed(2)}{" "}
                  {product.base_unit || "g"}
                </p>
              </div>
            )}
          </div>

          {/* Weight Input */}
          <div>
            <Label htmlFor="weight">Weight ({product?.base_unit || "g"})</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
              disabled={processing}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum: 0.01g</p>
          </div>

          {/* Quick Aliases */}
          {aliasBusiness === businessId && aliases.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">
                Quick Select
              </Label>
              <div className="flex flex-wrap gap-2">
                {aliases.map((alias) => (
                  <Button
                    key={alias.id}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-accent/5 hover:bg-accent/20 border-accent/20"
                    onClick={() => setWeightGrams(aliasWeightGrams(alias).toString())}
                  >
                    {alias.alias_name} ({formatQuantity(alias.quantity)}
                    {alias.standard_unit})
                  </Button>
                ))}
              </div>
            </div>
          )}

          {loadingAliases && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading quick terms...
            </div>
          )}

          {/* Price Breakdown */}
          {weight && weight > 0 && (
            <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-900">
                  Price per {product?.base_unit || "g"}
                </span>
                <span className="font-medium text-blue-900">
                  ${pricePerGram?.toFixed(2)}
                </span>
              </div>

              {tierName && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-900">Bulk Tier</span>
                  <span className="font-medium text-blue-900 px-2 py-1 bg-blue-100 rounded text-xs">
                    {tierName}
                  </span>
                </div>
              )}

              <div className="border-t border-blue-200 pt-2 flex justify-between items-center font-semibold">
                <span className="text-blue-900">Total Price</span>
                <span className="text-lg text-blue-900">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {pricingError && <p role="alert" className="text-sm text-destructive">{pricingError}</p>}
          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={processing || !quoteReady}
            >
              {processing ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
