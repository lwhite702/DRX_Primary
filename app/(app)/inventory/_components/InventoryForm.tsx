import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventorySchema, type Inventory } from "@/lib/validations/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { getUnitForCategory } from "@/lib/utils/units";

interface InventoryFormProps {
  initialData?: Inventory | null;
  businessId: string;
  onSuccess: (data: Inventory) => Promise<string | void>;
  onCancel: () => void;
}

export function InventoryForm({
  initialData,
  businessId,
  onSuccess,
  onCancel,
}: InventoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Inventory>({
    resolver: zodResolver(inventorySchema),
    defaultValues: initialData || {
      business_id: businessId,
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g", // Default
    },
  });

  // Watch category changes to auto-set unit
  const category = watch("category");

  // Auto-set unit based on category
  React.useEffect(() => {
    // Only set unit if we aren't editing an existing item (to avoid overwriting user choice).
    // usage: If initialData has an ID, it's an existing item. If not (or null), it's new.
    const isExistingItem =
      initialData &&
      "id" in initialData &&
      !!(initialData as { id?: string }).id;

    if (category && !isExistingItem) {
      const unit = getUnitForCategory(category);
      setValue("unit_of_measure", unit);
    }
  }, [category, initialData, setValue]);

  return (
    <form onSubmit={handleSubmit(onSuccess)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">
            SKU *
            <HelpTooltip content="Stock Keeping Unit - a unique identifier for this product" />
          </Label>
          <Input id="sku" {...register("sku")} />
          {errors.sku && (
            <p className="text-sm text-destructive">{errors.sku.message}</p>
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
}
