import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { type Inventory } from "@/lib/validations/schemas";
import { toast } from "sonner";

export function useInventoryActions(businessId: string | undefined) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);

  // Cost breakdown state
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  // Using Inventory type with optional ID property since selectedProduct comes from the list
  const [selectedProduct, setSelectedProduct] = useState<
    (Inventory & { id?: string }) | null
  >(null);

  const supabase = getSupabaseClient();

  const handleNew = () => {
    setEditingItem(null);
    // Note: Random SKU generation is now handled in the Form default values or we can pass it here.
    // In the original, it reset the form with a random SKU.
    // To keep it simple, we'll construct a "partial" initial data here if needed,
    // but the Form component handles defaults.
    // However, the Form uses `defaultValues` at mount.
    // We can pass a "fresh" object for new items to ensure unique SKU if we want to pre-fill it.
    // For now, let's just open the dialog. The Form component can handle generating SKU if passed,
    // or we can generate it here and pass as `initialData`.

    // Generating SKU here to match original behavior of pre-filling logic
    const randomSku = `PROD-${Math.floor(100000 + Math.random() * 900000)}`;
    setEditingItem({
      business_id: businessId || "",
      sku: randomSku,
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g",
    } as Inventory);
    setShowDialog(true);
  };

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleSave = async (data: Inventory) => {
    if (!businessId || !supabase) {
      toast.error("Business not found");
      return;
    }

    const promise = async () => {
      // Check if we are updating an existing item
      // The `editingItem` state holds the original item being edited
      // But for "New" item, `editingItem` might be the "template" we created in handleNew.
      // We need a reliable way to know if it's an update (has ID) or insert.
      // The `data` submitted from form might not have `id` if it wasn't in the schema/form inputs.
      // `editingItem` has the ID.

      // CAREFUL: In handleNew I set a template object. It DOES NOT have an ID.
      // So if editingItem.id exists, it's an update.

      if (editingItem && "id" in editingItem && editingItem.id) {
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
          business_id: businessId,
        });

        if (error) throw error;
        return "Item added successfully";
      }
    };

    try {
      const message = await promise();
      toast.success(message);
      setShowDialog(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save item",
      );
    }
  };

  return {
    showDialog,
    setShowDialog,
    editingItem,
    setEditingItem,
    showCostBreakdown,
    setShowCostBreakdown,
    selectedProduct,
    setSelectedProduct,
    handleNew,
    handleEdit,
    handleSave,
  };
}
