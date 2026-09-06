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
import { toast } from "sonner";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface InventoryCheckModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess?: () => void;
}

export function InventoryCheckModal({
  open,
  onClose,
  businessId,
  onSuccess,
}: InventoryCheckModalProps) {
  const [product, setProduct] = useState<{
    inventory_id?: string;
    product_name?: string;
    expected_weight_grams?: number;
  } | null>(null);
  const [measuredWeight, setMeasuredWeight] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !businessId) return;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setMeasuredWeight("");

      const productData =
        await posWeightEngine.getRandomCheckProduct(businessId);

      if (productData.error) {
        setError(productData.error);
      } else {
        setProduct(productData);
      }

      setLoading(false);
    };

    loadProduct();
  }, [open, businessId]);

  const handleSubmit = async () => {
    if (!product?.inventory_id) {
      toast.error("No product selected");
      return;
    }

    if (!measuredWeight || parseFloat(measuredWeight) < 0) {
      toast.error("Please enter a valid measured weight");
      return;
    }

    setProcessing(true);

    try {
      const checkResult = await posWeightEngine.recordInventoryCheck(
        businessId,
        product.inventory_id,
        parseFloat(measuredWeight),
      );

      if (checkResult.success) {
        setResult(checkResult);

        if (checkResult.discrepancy_flagged) {
          toast.warning("Discrepancy detected and logged");
        } else {
          toast.success("Stock check saved.");
        }

        onSuccess?.();
      } else {
        toast.error(
          checkResult.error || "That stock check didn’t save. Try again.",
        );
      }
    } catch (error) {
      console.error("Error recording check:", error);
      toast.error("That stock check didn’t save. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Inventory Check</DialogTitle>
          <DialogDescription>
            Weigh the product and enter the measured weight
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading product for check...
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded flex gap-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Success Result */}
              <div className="space-y-3">
                <div
                  className={`p-4 border rounded-lg ${
                    result.discrepancy_flagged
                      ? "bg-amber-50 border-amber-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      result.discrepancy_flagged
                        ? "text-amber-900"
                        : "text-green-900"
                    }`}
                  >
                    {result.discrepancy_flagged ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {result.discrepancy_flagged
                        ? "Discrepancy Detected"
                        : "Check Passed"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Expected</p>
                    <p className="font-medium">
                      {result.expected_weight_grams?.toFixed(2)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Measured</p>
                    <p className="font-medium">
                      {result.measured_weight_grams?.toFixed(2)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Delta</p>
                    <p
                      className={`font-medium ${
                        result.discrepancy_flagged
                          ? "text-destructive"
                          : "text-green-600"
                      }`}
                    >
                      {Math.abs(result.delta_grams || 0).toFixed(2)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variance %</p>
                    <p
                      className={`font-medium ${
                        result.discrepancy_flagged
                          ? "text-destructive"
                          : "text-green-600"
                      }`}
                    >
                      {Math.abs(result.delta_percentage || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {result.discrepancy_flagged && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                  This discrepancy has been logged as shrinkage for
                  investigation.
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button onClick={handleClose} disabled={processing}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Input Form */}
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    {product?.product_name}
                  </p>
                  <p className="text-sm text-blue-800">
                    Expected weight:{" "}
                    <span className="font-bold">
                      {product?.expected_weight_grams?.toFixed(2)}g
                    </span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="measured">Measured Weight (grams)</Label>
                  <Input
                    id="measured"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={measuredWeight}
                    onChange={(e) => setMeasuredWeight(e.target.value)}
                    disabled={processing}
                    autoFocus
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Weigh the product accurately and enter the measured value.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={processing}
                >
                  Skip
                </Button>
                <Button onClick={handleSubmit} disabled={processing}>
                  {processing ? "Recording..." : "Submit Check"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
