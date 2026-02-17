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
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import { createAppClient } from "@/lib/data/client/supabase-client";
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
  const [aliases, setAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [processing, setProcessing] = useState(false);
  const supabase = createAppClient();

  useEffect(() => {
    if (weightGrams && product && businessId) {
      const calculatePrice = async () => {
        const weight = parseFloat(weightGrams);
        if (weight > 0) {
          const pricing = await posWeightEngine.getBulkPricing(
            businessId,
            product.id,
            weight,
          );

          setPricePerGram(pricing.price_per_gram);
          setTierName(pricing.tier_name || null);
          setTotalPrice(pricing.total_price);
        }
      };

      calculatePrice();
    }
  }, [weightGrams, product, businessId]);

  useEffect(() => {
    if (open && businessId && supabase) {
      const fetchAliases = async () => {
        setLoadingAliases(true);
        try {
          const { data, error } = await supabase
            .from("product_unit_aliases")
            .select("*")
            .eq("business_id", businessId)
            .eq("is_enabled", true)
            .order("quantity", { ascending: true });

          if (error) throw error;
          setAliases(data || []);
        } catch (error) {
          console.error("Error fetching aliases:", error);
        } finally {
          setLoadingAliases(false);
        }
      };

      fetchAliases();
    }
  }, [open, businessId, supabase]);

  const handleAddToCart = () => {
    if (!product) {
      toast.error("No product selected");
      return;
    }

    if (!weightGrams || parseFloat(weightGrams) <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    if (pricePerGram === null) {
      toast.error("Failed to calculate price");
      return;
    }

    if (
      product.inventory_in_grams &&
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
          {aliases.length > 0 && (
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
                    onClick={() => setWeightGrams(alias.quantity.toString())}
                  >
                    {alias.alias_name} ({alias.quantity}
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
                  ${pricePerGram?.toFixed(4)}
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

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={processing || !weightGrams}
            >
              {processing ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
