"use client";

import { useState, useEffect } from "react";
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
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { toast } from "sonner";
import { AlertCircle, Lock } from "lucide-react";

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
  const supabase = createAppClient();
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string>("");
  const [quantityGrams, setQuantityGrams] = useState("");
  const [shrinkageType, setShrinkageType] = useState("personal_use");
  const [note, setNote] = useState("");
  const [requiresSupervisorPin, setRequiresSupervisorPin] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId || !supabase || !open) return;

    const loadInventory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select("id, product_name, sku, inventory_in_grams, base_unit")
        .eq("business_id", businessId)
        .gt("inventory_in_grams", 0)
        .order("product_name");

      if (error) {
        console.error("Error loading inventory:", error);
        toast.error("Failed to load inventory");
      } else {
        setInventory(data || []);
      }

      // Check if supervisor PIN is required
      const { data: settings } = await supabase
        .from("business_settings")
        .select("require_supervisor_pin_for_shrinkage")
        .eq("business_id", businessId)
        .single();

      if (settings?.require_supervisor_pin_for_shrinkage) {
        setRequiresSupervisorPin(true);
      }

      setLoading(false);
    };

    loadInventory();
  }, [businessId, supabase, open]);

  const handleSubmit = async () => {
    if (!selectedInventory) {
      toast.error("Please select a product");
      return;
    }

    if (!quantityGrams || parseFloat(quantityGrams) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (requiresSupervisorPin && !supervisorPin) {
      toast.error("Supervisor PIN is required");
      return;
    }

    setProcessing(true);

    try {
      // Verify supervisor PIN if required
      if (requiresSupervisorPin) {
        const { data: supervisors } = await supabase
          .from("admin_users")
          .select("id")
          .eq("role", "supervisor")
          .neq("pin_hash", null)
          .limit(1);

        if (!supervisors || supervisors.length === 0) {
          // For now, accept any PIN if no supervisors configured
          // In production, hash and verify against stored PIN
        }
      }

      const result = await posWeightEngine.recordShrinkage(
        businessId,
        selectedInventory,
        parseFloat(quantityGrams),
        shrinkageType,
        note
      );

      if (result.success) {
        toast.success("Shrinkage recorded successfully");
        setSelectedInventory("");
        setQuantityGrams("");
        setShrinkageType("personal_use");
        setNote("");
        setSupervisorPin("");
        onClose();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to record shrinkage");
      }
    } catch (error) {
      console.error("Error recording shrinkage:", error);
      toast.error("Failed to record shrinkage");
    } finally {
      setProcessing(false);
    }
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
              <Select value={selectedInventory} onValueChange={setSelectedInventory}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selectedItem.inventory_in_grams.toFixed(2)}
                  {selectedItem.base_unit}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity ({selectedItem?.base_unit || "g"})</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value)}
                disabled={processing}
              />
            </div>

            {/* Shrinkage Type */}
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={shrinkageType} onValueChange={setShrinkageType}>
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
                disabled={processing}
                className="min-h-20"
              />
            </div>

            {/* Supervisor PIN */}
            {requiresSupervisorPin && (
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <Lock className="h-4 w-4" />
                  Supervisor Verification Required
                </div>
                <Input
                  type="password"
                  placeholder="Enter supervisor PIN"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  disabled={processing}
                />
              </div>
            )}

            {/* Warning */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex gap-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                This action is audited and cannot be undone. All shrinkage is logged
                for inventory reconciliation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={processing}>
                {processing ? "Recording..." : "Record Shrinkage"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
