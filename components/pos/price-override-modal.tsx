"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface PriceOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  currentPrice: number;
  onConfirm: (newPrice: number, reason?: string) => void;
}

export function PriceOverrideModal({
  open,
  onOpenChange,
  productName,
  currentPrice,
  onConfirm,
}: PriceOverrideModalProps) {
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const price = parseFloat(newPrice);

    if (isNaN(price) || price < 0) {
      setError("Please enter a valid price");
      return;
    }

    if (price === currentPrice) {
      setError("New price must be different from current price");
      return;
    }

    onConfirm(price, reason || undefined);
    handleClose();
  };

  const handleClose = () => {
    setNewPrice(currentPrice.toString());
    setReason("");
    setError("");
    onOpenChange(false);
  };

  const priceDifference = parseFloat(newPrice) - currentPrice;
  const percentageChange =
    currentPrice > 0
      ? ((priceDifference / currentPrice) * 100).toFixed(1)
      : "0";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Override Price
          </DialogTitle>
          <DialogDescription>
            Manually override the price for <strong>{productName}</strong>. This
            action will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-price">Current Price</Label>
            <Input
              id="current-price"
              value={`$${currentPrice.toFixed(2)}`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-price">
              New Price <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-price"
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => {
                setNewPrice(e.target.value);
                setError("");
              }}
              placeholder="Enter new price"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {newPrice &&
            !isNaN(parseFloat(newPrice)) &&
            parseFloat(newPrice) !== currentPrice && (
              <div className="rounded-md bg-muted p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Change:</span>
                  <span
                    className={
                      priceDifference > 0
                        ? "text-green-600 font-medium"
                        : "text-red-600 font-medium"
                    }
                  >
                    {priceDifference > 0 ? "+" : ""}$
                    {priceDifference.toFixed(2)} (
                    {priceDifference > 0 ? "+" : ""}
                    {percentageChange}%)
                  </span>
                </div>
              </div>
            )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer negotiation, damaged item, promotional discount"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Providing a reason helps with audit trails and reporting.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="default">
            Confirm Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
