import React, { useState } from "react";
import { type Inventory } from "@/lib/validations/schemas";
import { toast } from "sonner";

type InventoryApiItem = Record<string, unknown> & {
  id?: string;
  businessId?: string;
  productName?: string;
  quantityOnHand?: number;
  reorderLevel?: number;
  unitCost?: number | string | null;
  sellingPrice?: number | string | null;
  supplierId?: string | null;
  baseUnit?: string | null;
};

function normalizeInventoryItem(item: InventoryApiItem): Inventory {
  const unitCost = item.unit_cost ?? item.unitCost;
  const sellingPrice = item.selling_price ?? item.sellingPrice;
  return {
    id: item.id,
    business_id: String(item.business_id ?? item.businessId ?? ""),
    sku: String(item.sku ?? ""),
    product_name: String(item.product_name ?? item.productName ?? ""),
    description:
      typeof item.description === "string" ? item.description : undefined,
    category: typeof item.category === "string" ? item.category : undefined,
    unit_of_measure: (item.unit_of_measure ?? item.baseUnit ?? "g") as Inventory["unit_of_measure"],
    quantity_on_hand: Number(item.quantity_on_hand ?? item.quantityOnHand ?? 0),
    reorder_level: Number(item.reorder_level ?? item.reorderLevel ?? 10),
    unit_cost: unitCost != null ? Number(unitCost) : undefined,
    selling_price: sellingPrice != null ? Number(sellingPrice) : undefined,
    supplier_id:
      typeof (item.supplier_id ?? item.supplierId) === "string"
        ? String(item.supplier_id ?? item.supplierId)
        : undefined,
  };
}

async function readApiResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Inventory request failed");
  }
  return body;
}

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

  // Fetch inventory
  React.useEffect(() => {
    if (!businessId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/inventory?limit=200&business_id=${encodeURIComponent(businessId)}`,
          {
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        const body = await readApiResponse(response);
        const rows = Array.isArray(body.data) ? body.data : [];
        setInventory(rows.map(normalizeInventoryItem));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load inventory", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to load inventory",
          );
          setInventory([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchInventory();
    return () => controller.abort();
  }, [businessId]);

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
    if (!businessId) {
      toast.error("Business not found");
      return;
    }

    const promise = async () => {
      if (editingItem && "id" in editingItem && editingItem.id) {
        const response = await fetch(`/api/inventory/${editingItem.id}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await readApiResponse(response);
        const updatedItem = normalizeInventoryItem(body.data ?? data);
        setInventory((prev) =>
          prev.map((item) =>
            item.id === editingItem.id ? updatedItem : item,
          ),
        );
        return "Item updated successfully";
      } else {
        const response = await fetch("/api/inventory", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, business_id: businessId }),
        });
        const newItem = normalizeInventoryItem(await readApiResponse(response));
        setInventory((prev) => [...prev, newItem]);
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
