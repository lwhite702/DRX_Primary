"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface IntakeLineItem {
  inventory_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

export default function InventoryIntakePage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const [intakeItems, setIntakeItems] = useState<IntakeLineItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [intakeQuantity, setIntakeQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const supabase = getSupabaseClient();

  const handleAddItem = () => {
    if (!selectedInventoryId || !intakeQuantity) {
      toast.error("Please select a product and enter quantity");
      return;
    }

    const selectedItem = inventory.find((i) => i.id === selectedInventoryId);
    if (!selectedItem) {
      toast.error("Product not found");
      return;
    }

    const quantity = parseFloat(intakeQuantity);
    const cost = parseFloat(unitCost) || selectedItem.unit_cost || 0;

    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const existingIndex = intakeItems.findIndex(
      (item) => item.inventory_id === selectedInventoryId
    );

    if (existingIndex >= 0) {
      const updated = [...intakeItems];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].unit_cost = cost;
      setIntakeItems(updated);
    } else {
      setIntakeItems([
        ...intakeItems,
        {
          inventory_id: selectedInventoryId,
          product_name: selectedItem.product_name,
          quantity,
          unit_cost: cost,
        },
      ]);
    }

    setSelectedInventoryId("");
    setIntakeQuantity("");
    setUnitCost("");
    toast.success(`${selectedItem.product_name} added to intake`);
  };

  const handleRemoveItem = (index: number) => {
    setIntakeItems(intakeItems.filter((_, i) => i !== index));
  };

  const handleProcessIntake = async () => {
    if (intakeItems.length === 0) {
      toast.error("No items to intake");
      return;
    }

    if (!business?.id || !supabase) {
      toast.error("Business not found");
      return;
    }

    setProcessing(true);

    try {
      for (const item of intakeItems) {
        const { data: currentInventory, error: fetchError } = await supabase
          .from("inventory")
          .select("quantity_on_hand")
          .eq("id", item.inventory_id)
          .eq("business_id", business.id)
          .single();

        if (fetchError || !currentInventory) {
          throw new Error(`Failed to fetch inventory for ${item.product_name}`);
        }

        const newQuantity = currentInventory.quantity_on_hand + item.quantity;

        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            quantity_on_hand: newQuantity,
            unit_cost: item.unit_cost,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.inventory_id);

        if (updateError) {
          throw updateError;
        }

        const { error: logError } = await supabase
          .from("inventory_log")
          .insert({
            inventory_id: item.inventory_id,
            transaction_type: "intake",
            quantity_change: item.quantity,
            reason: supplier ? `Supplier: ${supplier}` : "Manual intake",
          });

        if (logError) {
          console.warn("Failed to log inventory movement:", logError);
        }
      }

      toast.success(
        `Successfully intaked ${intakeItems.length} product(s)`
      );
      setIntakeItems([]);
      setSupplier("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process intake");
    } finally {
      setProcessing(false);
    }
  };

  if (businessLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!business) {
    return (
      <div className="p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  const totalIntakeCost = intakeItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Intake</h1>
        <p className="text-muted-foreground mt-2">
          Add inventory items to your stock
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intake Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Add Items to Intake</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier (Optional)</Label>
              <Input
                id="supplier"
                placeholder="Supplier name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product to intake" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} (SKU: {item.sku}, Current: {item.quantity_on_hand})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={intakeQuantity}
                  onChange={(e) => setIntakeQuantity(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost (Optional)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <Button onClick={handleAddItem} className="w-full" disabled={processing}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Intake
            </Button>
          </CardContent>
        </Card>

        {/* Intake Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Intake Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">{intakeItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Units:</span>
                <span className="font-medium">
                  {intakeItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-bold">
                  ${totalIntakeCost.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleProcessIntake}
              disabled={intakeItems.length === 0 || processing}
              className="w-full"
              size="lg"
            >
              {processing ? "Processing..." : "Process Intake"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Intake Items Table */}
      {intakeItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items for Intake</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {intakeItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                      <TableCell>${(item.quantity * item.unit_cost).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={processing}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
