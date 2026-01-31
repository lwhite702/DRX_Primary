"use client";

import React, { useState } from "react";
import { CardContent } from "@/components/ui/card";
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
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen } from "lucide-react";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Plus, Edit, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { inventorySchema, type Inventory } from "@/lib/validations/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductCostBreakdown } from "@/components/crm/ProductCostBreakdown";
import { Tour } from "@/components/ui/tour";
import { getUnitForCategory } from "@/lib/utils/units";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InventoryPage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);
  const [showDialog, setShowDialog] = useState(false);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const supabase = getSupabaseClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Inventory>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      business_id: business?.id || "",
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g",
    },
  });

  // Watch category changes to auto-set unit
  const category = watch("category");

  // Auto-set unit based on category
  React.useEffect(() => {
    if (category && !editingItem) {
      const unit = getUnitForCategory(category);
      setValue("unit_of_measure", unit);
    }
  }, [category, editingItem, setValue]);

  const onSubmit = async (data: Inventory) => {
    if (!business?.id || !supabase) {
      toast.error("Business not found");
      return;
    }

    const promise = async () => {
      if (editingItem?.id) {
        const { error } = await supabase
          .from("inventory")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        return "Item updated successfully";
      } else {
        const { error } = await supabase.from("inventory").insert({
          ...data,
          business_id: business.id,
        });

        if (error) throw error;
        return "Item added successfully";
      }
    };

    toast.promise(promise(), {
      loading: editingItem ? "Updating item..." : "Adding item...",
      success: (message) => {
        setShowDialog(false);
        setEditingItem(null);
        reset();
        return message;
      },
      error: (error) =>
        error instanceof Error ? error.message : "Failed to save item",
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    reset(item);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    // Auto-generate SKU: PROD- + 6 random digits
    const randomSku = `PROD-${Math.floor(100000 + Math.random() * 900000)}`;
    reset({
      business_id: business?.id || "",
      sku: randomSku,
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g",
    });
    setShowDialog(true);
  };

  const lowStockItems = inventory.filter(
    (item) => item.quantity_on_hand <= item.reorder_level,
  );

  if (businessLoading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 page-transition">
      <div className="noise-overlay" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
        <div>
          <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
            INVENTORY
          </h1>
          <p className="technical-label text-xs text-muted-foreground/60 mt-1">
            MANAGEMENT CONSOLE • {inventory.length} SKUS
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/inventory/intake" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-border bg-background/50 backdrop-blur hover:bg-muted/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              INTAKE STOCK
            </Button>
          </a>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={handleNew}
                className="w-full sm:w-auto laser-button bg-[#FF0099] text-white hover:bg-[#FF0099]/90 shadow-[0_0_15px_rgba(255,0,153,0.4)] border-none font-bold tracking-wider"
                id="tour-inventory-add-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                ADD ITEM
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Item" : "Add New Item"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Update product details"
                    : "Add a new item to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">
                      SKU *
                      <HelpTooltip content="Stock Keeping Unit - a unique identifier for this product" />
                    </Label>
                    <Input id="sku" {...register("sku")} />
                    {errors.sku && (
                      <p className="text-sm text-destructive">
                        {errors.sku.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Product Name *</Label>
                    <Input id="product_name" {...register("product_name")} />
                    {errors.product_name && (
                      <p className="text-sm text-destructive">
                        {errors.product_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" {...register("description")} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category
                      <HelpTooltip content="Determines measurement unit: liquids use oz, solids use g" />
                    </Label>
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
                      <p className="text-sm text-destructive">
                        {errors.quantity_on_hand.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reorder_level">
                      Reorder Level *
                      <HelpTooltip content="You'll be notified when stock falls below this amount" />
                    </Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      {...register("reorder_level", { valueAsNumber: true })}
                    />
                    {errors.reorder_level && (
                      <p className="text-sm text-destructive">
                        {errors.reorder_level.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">
                      Unit Cost
                      <HelpTooltip content="What you pay for this item (used for profit calculations)" />
                    </Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      {...register("unit_cost", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selling_price">
                    Selling Price
                    <HelpTooltip content="What customers pay for this item" />
                  </Label>
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
                    {isSubmitting
                      ? "Saving..."
                      : editingItem
                        ? "Update"
                        : "Add"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="relative z-10 p-4 rounded-xl bg-gradient-to-r from-[#FF0099]/10 to-transparent border border-[#FF0099]/30 shadow-lg shadow-[#FF0099]/10">
          <div className="flex items-center gap-2 text-[#FF0099]">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">
              {lowStockItems.length} item(s) below reorder level
            </p>
          </div>
        </div>
      )}

      {/* Cost Breakdown Dialog */}
      <Dialog open={showCostBreakdown} onOpenChange={setShowCostBreakdown}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.product_name || "Product"} - Cost Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed cost history and breakdown for this product
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <ProductCostBreakdown
              inventoryId={selectedProduct.id}
              productName={selectedProduct.product_name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Table */}
      <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border relative z-10">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#FF0099] shadow-[0_0_10px_#FF0099]" />
          <h2 className="headline-text text-lg tracking-wider text-[#FF0099]">
            PRODUCT LIST
          </h2>
        </div>
        <CardContent className="p-0">
          {inventory.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="No products"
              description="Add your first product to start tracking inventory."
              actionLabel="Add Item"
              onAction={handleNew}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {inventory.map((item) => {
                  const isLowStock =
                    item.quantity_on_hand <= item.reorder_level;
                  return (
                    <div
                      key={item.id}
                      className={`
                        p-4 border-b border-white/5 last:border-0 hover:bg-[#FF0099]/5 transition-colors
                        ${isLowStock ? "bg-red-500/5 border-l-2 border-l-red-500" : ""}
                      `}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium break-words">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-mono">{item.sku}</span>
                              {item.category ? ` • ${item.category}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedProduct(item);
                                setShowCostBreakdown(true);
                              }}
                              aria-label="View cost breakdown"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              aria-label="Edit item"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Stock
                            </p>
                            <p
                              className={
                                isLowStock
                                  ? "font-bold text-destructive"
                                  : "font-medium"
                              }
                            >
                              {item.quantity_on_hand}
                              {item.unit_of_measure || "g"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Reorder Level
                            </p>
                            <p className="font-medium">{item.reorder_level}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Unit Cost
                            </p>
                            <p className="font-medium">
                              {item.unit_cost
                                ? "$" + Number(item.unit_cost).toFixed(2)
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Selling Price
                            </p>
                            <p className="font-medium">
                              {item.selling_price
                                ? "$" + Number(item.selling_price).toFixed(2)
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10">
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        SKU
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Product Name
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Category
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Stock
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Reorder
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Cost
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Price
                      </TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => {
                      const isLowStock =
                        item.quantity_on_hand <= item.reorder_level;
                      return (
                        <TableRow
                          key={item.id}
                          className={`
                            border-white/5 hover:bg-[#FF0099]/5 transition-colors group
                            ${isLowStock ? "bg-red-500/5" : ""}
                          `}
                        >
                          <TableCell className="font-mono">
                            {item.sku}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.product_name}
                          </TableCell>
                          <TableCell>{item.category || "-"}</TableCell>
                          <TableCell>
                            <span
                              className={
                                isLowStock ? "text-destructive font-bold" : ""
                              }
                            >
                              {item.quantity_on_hand}
                              {item.unit_of_measure || "g"}
                            </span>
                          </TableCell>
                          <TableCell>{item.reorder_level}</TableCell>
                          <TableCell>
                            {item.unit_cost
                              ? "$" + Number(item.unit_cost).toFixed(2)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-[#FF0099] font-bold">
                              {item.selling_price
                                ? "$" + Number(item.selling_price).toFixed(2)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(item);
                                  setShowCostBreakdown(true);
                                }}
                                title="View cost breakdown"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </div>

      <Tour
        tourId="inventory_v1"
        steps={[
          {
            targetId: "tour-inventory-add-btn",
            title: "Add your first product",
            description:
              "Click here to add inventory. You can track quantities, costs, and set reorder alerts.",
          },
        ]}
        onComplete={() => {}}
      />
    </div>
  );
}
