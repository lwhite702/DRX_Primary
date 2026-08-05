"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PermissionGuard } from "@/components/auth/role-guard";
import { SalesSkeleton } from "@/components/skeletons/sales-skeleton";
import { getUnitLabel, type UnitOfMeasure } from "@/lib/utils/units";

interface IntakeFormData {
  inventory_id: string;
  product_name: string;
  unit_of_measure: UnitOfMeasure;
  total_cost: string;
  total_weight_grams: string;
  delivery_cost: string;
  supplier: string;
}

export default function InventoryIntakePage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const inventoryItems = Array.isArray(inventory) ? inventory : [];
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState<IntakeFormData>({
    inventory_id: "",
    product_name: "",
    unit_of_measure: "g",
    total_cost: "",
    total_weight_grams: "",
    delivery_cost: "0",
    supplier: "",
  });

  // Calculate cost per gram
  const costPerUnit =
    parseFloat(formData.total_cost) && parseFloat(formData.total_weight_grams)
      ? parseFloat(formData.total_cost) /
        parseFloat(formData.total_weight_grams)
      : 0;

  const totalIntakeCost =
    parseFloat(formData.total_cost || "0") +
    parseFloat(formData.delivery_cost || "0");

  const handleProductChange = (value: string) => {
    const selectedItem = inventoryItems.find((i) => i.id === value);
    setFormData({
      ...formData,
      inventory_id: value,
      product_name: selectedItem?.product_name || "",
      unit_of_measure: (selectedItem?.unit_of_measure as UnitOfMeasure) || "g",
    });
  };

  const handleOpenConfirmModal = () => {
    // Validation
    if (!formData.inventory_id) {
      toast.error("Please select a product");
      return;
    }

    if (!formData.total_cost || parseFloat(formData.total_cost) <= 0) {
      toast.error("Please enter a valid total cost");
      return;
    }

    if (
      !formData.total_weight_grams ||
      parseFloat(formData.total_weight_grams) < 0.01
    ) {
      toast.error("Please enter a valid weight (minimum 0.01g)");
      return;
    }

    if (parseFloat(formData.delivery_cost || "0") < 0) {
      toast.error("Delivery cost cannot be negative");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleProcessIntake = async () => {
    if (!business?.id) {
      toast.error("Business not found");
      return;
    }

    setProcessing(true);
    setShowConfirmModal(false);

    try {
      const response = await fetch("/api/inventory/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: formData.inventory_id,
          total_cost: parseFloat(formData.total_cost),
          total_weight_grams: parseFloat(formData.total_weight_grams),
          delivery_cost: parseFloat(formData.delivery_cost || "0"),
          supplier: formData.supplier || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process intake");
      }

      if (result.requires_approval) {
        toast.warning(result.message, {
          description: "A manager will need to review and approve this intake.",
          duration: 5000,
        });
      } else {
        toast.success(result.message);
      }

      // Reset form
      setFormData({
        inventory_id: "",
        product_name: "",
        unit_of_measure: "g",
        total_cost: "",
        total_weight_grams: "",
        delivery_cost: "0",
        supplier: "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process intake",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (businessLoading) {
    return <SalesSkeleton />;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <PermissionGuard
      requiredPermission="inventory.manage"
      fallback={
        <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-xl m-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2 tracking-widest uppercase">
            Access Denied
          </h1>
          <p className="text-muted-foreground font-mono">
            You do not have permission to access Inventory Intake.
          </p>
        </div>
      }
    >
      <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
        <div className="noise-overlay" />
        <div className="relative z-10">
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            INVENTORY INTAKE
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            COST TRACKING & STOCK ENTRY
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {/* Intake Form */}
          <div className="lg:col-span-2 luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border">
            <div className="p-6 border-b border-white/5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <h2 className="headline-text text-lg tracking-wider text-accent">
                INTAKE DETAILS
              </h2>
            </div>
            <CardContent className="space-y-4 p-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.inventory_id}
                  onValueChange={handleProductChange}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select product to intake" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.product_name} (SKU: {item.sku}, Stock:{" "}
                        {item.quantity_on_hand}g)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Input
                  id="supplier"
                  placeholder="Supplier name"
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Cost Structure
                </h3>

                {/* Total Cost */}
                <div className="space-y-2">
                  <Label htmlFor="total_cost">
                    Total Cost of Product ($) *
                  </Label>
                  <Input
                    id="total_cost"
                    type="number"
                    placeholder="0.00"
                    value={formData.total_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, total_cost: e.target.value })
                    }
                    min="0.01"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total amount paid for this bulk purchase
                  </p>
                </div>

                {/* Total Weight */}
                <div className="space-y-2">
                  <Label htmlFor="total_weight">
                    Total Weight Received (
                    {getUnitLabel(formData.unit_of_measure, true)}) *
                  </Label>
                  <Input
                    id="total_weight"
                    type="number"
                    placeholder="0.00"
                    value={formData.total_weight_grams}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_weight_grams: e.target.value,
                      })
                    }
                    min="0.01"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total weight of product received in this shipment (
                    {formData.unit_of_measure})
                  </p>
                </div>

                {/* Calculated Cost Per Unit */}
                <div className="space-y-2">
                  <Label>
                    Cost Per {getUnitLabel(formData.unit_of_measure)}{" "}
                    (calculated)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={
                        costPerUnit > 0
                          ? `$${costPerUnit.toFixed(6)}/${formData.unit_of_measure}`
                          : `$0.000000/${formData.unit_of_measure}`
                      }
                      readOnly
                      className="bg-muted"
                    />
                    {costPerUnit > 0 && (
                      <Badge variant="secondary">Auto-calculated</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculated from total cost ÷ total weight (per{" "}
                    {formData.unit_of_measure})
                  </p>
                </div>

                {/* Delivery Cost */}
                <div className="space-y-2">
                  <Label htmlFor="delivery_cost">
                    Delivery / Shipping Cost ($) (Optional)
                  </Label>
                  <Input
                    id="delivery_cost"
                    type="number"
                    placeholder="0.00"
                    value={formData.delivery_cost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery_cost: e.target.value,
                      })
                    }
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate delivery cost - NOT included in cost-per-gram
                  </p>
                </div>
              </div>

              <Button
                onClick={handleOpenConfirmModal}
                className="laser-button h-12 w-full border-none bg-accent text-lg font-bold uppercase tracking-wider text-black hover:bg-accent-light"
                disabled={processing}
                size="lg"
              >
                <Package className="h-5 w-5 mr-3" />
                Review & Process Intake
              </Button>
            </CardContent>
          </div>

          {/* Intake Summary */}
          <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border h-fit">
            <div className="p-6 border-b border-white/5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-info" />
              <h2 className="headline-text text-lg tracking-wider text-info">
                SUMMARY
              </h2>
            </div>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium text-right">
                    {formData.product_name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Weight:</span>
                  <span className="font-medium">
                    {formData.total_weight_grams || "0"}
                    {formData.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Cost:</span>
                  <span className="font-medium">
                    ${parseFloat(formData.total_cost || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Cost:</span>
                  <span className="font-medium">
                    ${parseFloat(formData.delivery_cost || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground font-semibold">
                    Total Intake Cost:
                  </span>
                  <span className="font-bold text-lg">
                    ${totalIntakeCost.toFixed(2)}
                  </span>
                </div>
                {costPerUnit > 0 && (
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-muted-foreground">
                      Cost/
                      {getUnitLabel(formData.unit_of_measure)
                        .charAt(0)
                        .toUpperCase() +
                        getUnitLabel(formData.unit_of_measure).slice(1)}
                      :
                    </span>
                    <span className="font-mono font-bold text-primary">
                      ${costPerUnit.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        </div>

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Inventory Intake</DialogTitle>
              <DialogDescription>
                Please review the intake details before processing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{formData.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-medium">
                    {formData.supplier || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Weight:</span>
                  <span className="font-medium">
                    {formData.total_weight_grams}
                    {formData.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product Cost:</span>
                  <span className="font-medium">
                    ${parseFloat(formData.total_cost).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Cost:</span>
                  <span className="font-medium">
                    ${parseFloat(formData.delivery_cost || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Total Cost:</span>
                  <span className="font-bold">
                    ${totalIntakeCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm bg-primary/10 p-2 rounded">
                  <span className="font-semibold">
                    Cost Per{" "}
                    {getUnitLabel(formData.unit_of_measure)
                      .charAt(0)
                      .toUpperCase() +
                      getUnitLabel(formData.unit_of_measure).slice(1)}
                    :
                  </span>
                  <span className="font-mono font-bold text-primary">
                    ${costPerUnit.toFixed(6)}/{formData.unit_of_measure}
                  </span>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Ready to Process</AlertTitle>
                <AlertDescription>
                  This intake will update inventory quantity and cost history.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={handleProcessIntake} disabled={processing}>
                {processing ? "Processing..." : "Confirm Intake"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
