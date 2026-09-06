"use client";

import { useState, useRef } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/auth/role-guard";
import { SalesSkeleton } from "@/components/skeletons/sales-skeleton";
import { DataSyncStatus } from "@/components/ui/data-sync-status";

export default function InventoryAdjustPage() {
  const { business, loading: businessLoading } = useBusiness();
  const {
    inventory,
    loading: inventoryLoading,
    syncStatus,
    refresh: refreshInventory,
  } = useRealtimeInventory(business?.id || null);
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const [processing, setProcessing] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjustType, setAdjustType] = useState<"set" | "add" | "remove">("set");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const selectedProduct = inventory.find((p) => p.id === selectedProductId);

  const handleAdjust = async () => {
    if (inFlight.current) return;
    if (!business?.id || !selectedProductId || !value || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    let apiType: "set" | "delta" = "delta";
    let apiValue = numValue;

    if (adjustType === "set") {
      apiType = "set";
      apiValue = numValue;
    } else if (adjustType === "remove") {
      apiValue = -numValue;
    }
    // "add" is default positive delta

    const fingerprint = JSON.stringify([business.id, selectedProductId, apiType, apiValue, reason]);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
    inFlight.current = true;
    setProcessing(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-business-id": business.id, "idempotency-key": pending.current.key },
        body: JSON.stringify({
          inventory_id: selectedProductId,
          type: apiType,
          value: apiValue,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust");

      pending.current = null;
      await refreshInventory();
      toast.success("Inventory adjusted successfully");
      // Reset form
      setValue("");
      setReason("");
      // Keep product selected for convenience? Or reset? Let's keep it.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust");
    } finally {
      inFlight.current = false;
      setProcessing(false);
    }
  };

  if (businessLoading || inventoryLoading) return <SalesSkeleton />;

  return (
    <PermissionGuard
      requiredPermission="inventory.manage"
      fallback={<div>Access Denied</div>}
    >
      <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
        <div className="noise-overlay" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div>
          <h1 className="text-3xl font-bold">
            Adjust inventory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Correct a count and record the reason
          </p>
          </div>
          <DataSyncStatus status={syncStatus} onRefresh={() => void refreshInventory()} />
        </div>

        <div className="max-w-2xl luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border">
          <div className="p-6 border-b border-white/5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <h2 className="headline-text text-lg tracking-wider text-warning">
              Adjustment details
            </h2>
          </div>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label>Select Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search product..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} (Current: {item.quantity_on_hand}{" "}
                      {item.unit_of_measure})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="bg-muted/20 p-4 rounded-lg border border-white/5 space-y-1">
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {selectedProduct.quantity_on_hand}{" "}
                  <span className="text-sm text-muted-foreground">
                    {selectedProduct.unit_of_measure}
                  </span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={adjustType}
                  onValueChange={(v) =>
                    setAdjustType(v as "set" | "add" | "remove")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set Quantity To</SelectItem>
                    <SelectItem value="add">Add (+)</SelectItem>
                    <SelectItem value="remove">Remove (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Broken jar, Spillage, Inventory Count Correction"
              />
            </div>

            <Button
              onClick={handleAdjust}
              disabled={processing || !selectedProductId}
              className="h-12 w-full bg-warning text-lg font-bold uppercase tracking-wider text-black hover:brightness-110"
            >
              {processing ? "Updating..." : "Confirm Adjustment"}
            </Button>
          </CardContent>
        </div>
      </div>
    </PermissionGuard>
  );
}
