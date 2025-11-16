"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Edit, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { inventorySchema, type Inventory } from "@/lib/validations/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function InventoryPage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const supabase = getSupabaseClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Inventory>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      business_id: business?.id || "",
      quantity_on_hand: 0,
      reorder_level: 10,
    },
  });

  const onSubmit = async (data: Inventory) => {
    if (!business?.id || !supabase) {
      toast.error("Business not found");
      return;
    }

    try {
      if (editingItem?.id) {
        const { error } = await supabase
          .from("inventory")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Item updated successfully");
      } else {
        const { error } = await supabase.from("inventory").insert({
          ...data,
          business_id: business.id,
        });

        if (error) throw error;
        toast.success("Item added successfully");
      }

      setShowDialog(false);
      setEditingItem(null);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save item");
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    reset(item);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    reset({
      business_id: business?.id || "",
      quantity_on_hand: 0,
      reorder_level: 10,
    });
    setShowDialog(true);
  };

  const lowStockItems = inventory.filter(
    (item) => item.quantity_on_hand <= item.reorder_level
  );

  if (businessLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!business) {
    return <div className="p-8">No business found. Please set up your business first.</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-2">Manage inventory and stock levels</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update inventory item details"
                  : "Add a new item to your inventory"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input id="sku" {...register("sku")} />
                  {errors.sku && (
                    <p className="text-sm text-destructive">{errors.sku.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input id="product_name" {...register("product_name")} />
                  {errors.product_name && (
                    <p className="text-sm text-destructive">{errors.product_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register("description")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" {...register("category")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity_on_hand">Quantity on Hand *</Label>
                  <Input
                    id="quantity_on_hand"
                    type="number"
                    {...register("quantity_on_hand", { valueAsNumber: true })}
                  />
                  {errors.quantity_on_hand && (
                    <p className="text-sm text-destructive">{errors.quantity_on_hand.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level *</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    {...register("reorder_level", { valueAsNumber: true })}
                  />
                  {errors.reorder_level && (
                    <p className="text-sm text-destructive">{errors.reorder_level.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Unit Cost</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    {...register("unit_cost", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  {...register("selling_price", { valueAsNumber: true })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingItem(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingItem ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">
                {lowStockItems.length} item(s) below reorder level
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({inventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No inventory items yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const isLowStock = item.quantity_on_hand <= item.reorder_level;
                    return (
                      <TableRow key={item.id} className={isLowStock ? "bg-destructive/10" : ""}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={
                              isLowStock ? "text-destructive font-bold" : ""
                            }
                          >
                            {item.quantity_on_hand}
                          </span>
                        </TableCell>
                        <TableCell>{item.reorder_level}</TableCell>
                        <TableCell>
                          {item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {item.selling_price
                            ? `$${Number(item.selling_price).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
