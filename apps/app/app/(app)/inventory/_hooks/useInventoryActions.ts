import React, { useState } from "react";
import { createAppClient } from "@/lib/data/client/supabase-client";
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

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createAppClient();

  // Fetch inventory
  React.useEffect(() => {
    if (!businessId || !supabase) return;
    const fetchInventory = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("inventory")
        .select("*")
        .eq("business_id", businessId)
        .order("product_name");

      if (data) setInventory(data);
      setLoading(false);
    };
    fetchInventory();
  }, [businessId, supabase]);

  const handleAdd = () => {
    setEditingItem(null);
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
      if (editingItem && "id" in editingItem && editingItem.id) {
        const { error } = await supabase
          .from("inventory")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        // Optimistic update or refetch
        setInventory((prev) =>
          prev.map((item) =>
            item.id === editingItem.id ? { ...item, ...data } : item,
          ),
        );
        return "Item updated successfully";
      } else {
        const { data: newItem, error } = await supabase
          .from("inventory")
          .insert({
            ...data,
            business_id: businessId,
          })
          .select()
          .single();

        if (error) throw error;
        if (newItem) setInventory((prev) => [...prev, newItem]);
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
    inventory,
    loading,
    showDialog,
    setShowDialog,
    editingItem,
    setEditingItem,
    showCostBreakdown,
    setShowCostBreakdown,
    selectedProduct,
    setSelectedProduct,
    handleAdd,
    handleEdit,
    handleSave,
  };
}
