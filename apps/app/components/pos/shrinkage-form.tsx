"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recordShrinkage, ShrinkageRejectedError, type ShrinkageRequest } from "@/lib/pos/shrinkage-client";
import { loadShrinkageInventory, type ShrinkageProduct } from "@/lib/pos/shrinkage-inventory-client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface ShrinkageFormProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess?: () => void;
}

export function ShrinkageForm({
  open,
  onClose,
  businessId,
  onSuccess,
}: ShrinkageFormProps) {
  const [inventory, setInventory] = useState<ShrinkageProduct[]>([]);
  const scope = useRef(businessId); scope.current = businessId;
  const pending = useRef(new Map<string, ShrinkageRequest>());
  const busy = useRef(false);
  const [retryPending, setRetryPending] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<string>("");
  const [quantityGrams, setQuantityGrams] = useState("");
  const [shrinkageType, setShrinkageType] = useState<ShrinkageRequest["shrinkageType"]>("personal_use");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setInventory([]); setSelectedInventory(""); setQuantityGrams(""); setNote("");
    const attempt = pending.current.get(businessId);
    setRetryPending(Boolean(attempt));
    if (attempt) {
      setSelectedInventory(attempt.inventoryId); setQuantityGrams(String(attempt.quantityGrams));
      setShrinkageType(attempt.shrinkageType); setNote(attempt.note ?? "");
    }
    if (!businessId || !open) return () => controller.abort();
    setLoading(true);
    loadShrinkageInventory(businessId, controller.signal).then(items => {
      if (!controller.signal.aborted) setInventory(items);
    }).catch(() => {
      if (!controller.signal.aborted) toast.error("Failed to load inventory");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [businessId, open]);

  const handleSubmit = async () => {
    if (busy.current) return;
    const tenant = businessId;
    let attempt = pending.current.get(tenant);
    if (!attempt) {
      const quantity = Number(quantityGrams);
      if (!selectedInventory || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Select a product and enter a valid quantity"); return;
      }
      if (note.length > 500) { toast.error("Note must be 500 characters or fewer"); return; }
      attempt = { requestId: crypto.randomUUID(), inventoryId: selectedInventory, quantityGrams: quantity, shrinkageType, note };
      pending.current.set(tenant, attempt); setRetryPending(true);
    }
    busy.current = true; setProcessing(true);
    try {
      await recordShrinkage(tenant, attempt);
      pending.current.delete(tenant);
      if (scope.current !== tenant) return;
      setRetryPending(false); setSelectedInventory(""); setQuantityGrams(""); setNote("");
      toast.success("Shrinkage recorded successfully"); onClose(); onSuccess?.();
    } catch (error) {
      if (error instanceof ShrinkageRejectedError) {
        pending.current.delete(tenant);
        if (scope.current === tenant) setRetryPending(false);
      }
      if (scope.current === tenant) toast.error(error instanceof Error ? error.message : "Shrinkage could not be confirmed. Retry the same request.");
    } finally { busy.current = false; setProcessing(false); }
  };

  const selectedItem = inventory.find((item) => item.id === selectedInventory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Shrinkage / Personal Use</DialogTitle>
          <DialogDescription>
            Log inventory removal for personal use, store use, or damage
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading inventory...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Product Selection */}
            <div>
              <Label htmlFor="product">Product</Label>
              <Select
                value={selectedInventory}
                onValueChange={setSelectedInventory}
                disabled={processing || retryPending}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.productName} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selectedItem.inventoryInGrams.toFixed(2)}
                  {selectedItem.baseUnit}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">
                Quantity ({selectedItem?.baseUnit || "g"})
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value)}
                disabled={processing || retryPending}
              />
            </div>

            {/* Shrinkage Type */}
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={shrinkageType} onValueChange={value => setShrinkageType(value as ShrinkageRequest["shrinkageType"])} disabled={processing || retryPending}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal_use">Personal Use</SelectItem>
                  <SelectItem value="store_use">Store Use</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="sample">Sample</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Additional details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={processing || retryPending}
                className="min-h-20"
              />
            </div>

            {retryPending && <p role="status" className="text-sm text-muted-foreground">This attempt is awaiting confirmation. Retry to check or complete the same removal.</p>}

            {/* Warning */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex gap-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                This action is audited and cannot be undone. All shrinkage is
                logged for inventory reconciliation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={processing || loading || !businessId}>
                {processing ? "Recording..." : retryPending ? "Retry Shrinkage" : "Record Shrinkage"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
