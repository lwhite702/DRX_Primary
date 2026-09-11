"use client";

import { useState, useEffect, useRef } from "react";
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
import { getCheckProduct, recordCheck, InventoryCheckRejectedError, type CheckProduct, type CheckRequest, type CheckReceipt } from "@/lib/pos/inventory-check-client";
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
  const [product, setProduct] = useState<CheckProduct | null>(null);
  const [measuredWeight, setMeasuredWeight] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [retryPending, setRetryPending] = useState(false);
  const pending = useRef(new Map<string, { product: CheckProduct; request: CheckRequest }>());
  const scope = useRef(businessId); scope.current = businessId;
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null); setResult(null); setError(null); setMeasuredWeight(""); setLoading(false);
    const attempt = pending.current.get(businessId); setRetryPending(Boolean(attempt));
    if (!open || !businessId) return () => controller.abort();
    if (attempt) { setProduct(attempt.product); setMeasuredWeight(String(attempt.request.measuredWeightGrams)); return () => controller.abort(); }
    setLoading(true);
    getCheckProduct(businessId, controller.signal).then(value => { if (!controller.signal.aborted) setProduct(value); })
      .catch(() => { if (!controller.signal.aborted) setError("Inventory check could not be loaded. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, businessId, reload]);

  const handleSubmit = async () => {
    if (busy.current || !product || !businessId || result) return;
    const tenant = businessId;
    let attempt = pending.current.get(tenant);
    if (!attempt) {
      const measured = Number(measuredWeight);
      if (!measuredWeight.trim() || !Number.isFinite(measured) || measured < 0) { toast.error("Please enter a valid measured weight"); return; }
      attempt = { product, request: { requestId: crypto.randomUUID(), inventoryId: product.inventory_id, expectedWeightGrams: product.expected_weight_grams, measuredWeightGrams: measured } };
      pending.current.set(tenant, attempt); setRetryPending(true);
    }
    busy.current = true; setProcessing(true);
    try {
      const receipt = await recordCheck(tenant, attempt.request);
      pending.current.delete(tenant);
      if (scope.current !== tenant) return;
      setRetryPending(false); setResult(receipt);
      if (receipt.discrepancy_flagged) toast.warning("Discrepancy detected and logged"); else toast.success("Inventory check recorded");
      onSuccess?.();
    } catch (failure) {
      if (failure instanceof InventoryCheckRejectedError) {
        pending.current.delete(tenant);
        if (scope.current === tenant) { setRetryPending(false); if (failure.code === "STALE_STOCK") setReload(value => value + 1); }
      }
      if (scope.current === tenant) toast.error(failure instanceof Error ? failure.message : "Inventory check could not be confirmed. Retry the same request.");
    } finally { busy.current = false; setProcessing(false); }
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
              <p className="text-sm text-destructive">{error}</p><Button onClick={() => setReload(value => value + 1)}>Reload check</Button>
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
                      {result.discrepancy_flagged ? "Discrepancy Detected" : "Check Passed"}
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
                      {result.delta_percentage === null ? "Not applicable (zero expected stock)" : `${Math.abs(result.delta_percentage).toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              </div>

              {result.discrepancy_flagged && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                  This discrepancy has been logged as shrinkage for investigation.
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
                    Expected weight: <span className="font-bold">{product?.expected_weight_grams?.toFixed(2)}g</span>
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
                    disabled={processing || retryPending}
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
                <Button onClick={handleSubmit} disabled={processing || !product}>
                  {processing ? "Recording..." : retryPending ? "Retry Check" : "Submit Check"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
