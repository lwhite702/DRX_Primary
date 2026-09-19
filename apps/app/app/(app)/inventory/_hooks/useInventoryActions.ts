import React, { useCallback, useRef, useState } from "react";
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
    unit_of_measure: (item.unit_of_measure ??
      item.baseUnit ??
      "g") as Inventory["unit_of_measure"],
    quantity_on_hand: Number(item.quantity_on_hand ?? item.quantityOnHand ?? 0),
    reorder_level: Number(item.reorder_level ?? item.reorderLevel ?? 10),
    unit_cost: unitCost != null ? Number(unitCost) : undefined,
    selling_price: sellingPrice != null ? Number(sellingPrice) : undefined,
    location:
      typeof (item.location ?? item.location) === "string"
        ? (item.location as string)
        : undefined,
    is_taxable:
      typeof (item.is_taxable ?? item.isTaxable) === "boolean"
        ? Boolean(item.is_taxable ?? item.isTaxable)
        : true,
    is_active:
      typeof (item.is_active ?? item.isActive) === "boolean"
        ? Boolean(item.is_active ?? item.isActive)
        : true,
    supplier_id:
      typeof (item.supplier_id ?? item.supplierId) === "string"
        ? String(item.supplier_id ?? item.supplierId)
        : undefined,
  };
}

async function readApiResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "That stock change didn’t save. Try again.");
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
  const [refreshing, setRefreshing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewStatus, setViewStatus] = useState<"active" | "archived">("active");
  const loadedBusinessId = useRef<string | undefined>(undefined);
  const loadedViewStatus = useRef<string | undefined>(undefined);
  const requestController = useRef<AbortController | null>(null);

  const refreshInventory = useCallback(async () => {
    requestController.current?.abort();
    if (!businessId) {
      setInventory([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      loadedBusinessId.current = undefined;
      loadedViewStatus.current = undefined;
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;
    const hasCurrentData =
      loadedBusinessId.current === businessId &&
      loadedViewStatus.current === viewStatus;
    if (!hasCurrentData) setInventory([]);
    setLoading(!hasCurrentData);
    setRefreshing(hasCurrentData);
    setError(null);

    try {
      const response = await fetch(
        `/api/inventory?limit=200&business_id=${encodeURIComponent(businessId)}&status=${viewStatus}`,
        {
          credentials: "same-origin",
          signal: controller.signal,
        },
      );
      const body = await readApiResponse(response);
      if (controller.signal.aborted) return;
      const rows = Array.isArray(body.data) ? body.data : [];
      loadedBusinessId.current = businessId;
      loadedViewStatus.current = viewStatus;
      setInventory(rows.map(normalizeInventoryItem));
    } catch (caught) {
      if (!controller.signal.aborted) {
        console.error("Failed to load inventory", caught);
        const message =
          caught instanceof Error
            ? caught.message
            : "Couldn’t load products. Try again.";
        setError(message);
        if (!hasCurrentData) setInventory([]);
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [businessId, viewStatus]);

  React.useEffect(() => {
    void refreshInventory();
    return () => requestController.current?.abort();
  }, [refreshInventory]);

  const handleAdd = () => {
    setEditingItem(null);
    const randomSku = `PROD-${Math.floor(100000 + Math.random() * 900000)}`;
    setEditingItem({
      business_id: businessId || "",
      sku: randomSku,
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_of_measure: "g",
      is_active: true,
    } as Inventory);
    setShowDialog(true);
  };

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleArchive = async (item: Inventory) => {
    if (!item.id || !businessId) return;
    setMutating(true);
    try {
      const response = await fetch(
        `/api/inventory/${item.id}?business_id=${encodeURIComponent(businessId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );
      await readApiResponse(response);
      toast.success("Product archived.");
      if (editingItem?.id === item.id) {
        setShowDialog(false);
        setEditingItem(null);
      }
      await refreshInventory();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to archive product",
      );
    } finally {
      setMutating(false);
    }
  };

  const handleReactivate = async (item: Inventory) => {
    if (!item.id || !businessId) return;
    setMutating(true);
    try {
      const response = await fetch(
        `/api/inventory/${item.id}?business_id=${encodeURIComponent(businessId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        },
      );
      await readApiResponse(response);
      toast.success("Product reactivated.");
      await refreshInventory();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reactivate product",
      );
    } finally {
      setMutating(false);
    }
  };

  const handleSave = async (data: Inventory) => {
    if (!businessId) {
      toast.error("Business not found");
      return;
    }

    const promise = async () => {
      if (editingItem && "id" in editingItem && editingItem.id) {
        const response = await fetch(
          `/api/inventory/${editingItem.id}?business_id=${encodeURIComponent(businessId)}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
        const body = await readApiResponse(response);
        const updatedItem = normalizeInventoryItem(body.data ?? data);
        setInventory((prev) =>
          prev.map((item) => (item.id === editingItem.id ? updatedItem : item)),
        );
        return "Product updated.";
      } else {
        const response = await fetch("/api/inventory", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, business_id: businessId }),
        });
        const newItem = normalizeInventoryItem(await readApiResponse(response));
        setInventory((prev) => [...prev, newItem]);
        return "Product added.";
      }
    };

    setMutating(true);
    try {
      const message = await promise();
      toast.success(message);
      setShowDialog(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save item",
      );
    } finally {
      setMutating(false);
    }
  };

  return {
    inventory,
    loading,
    refreshing,
    mutating,
    error,
    viewStatus,
    setViewStatus,
    status: loading
      ? "loading"
      : error
        ? "error"
        : inventory.length
          ? "success"
          : "empty",
    refreshInventory,
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
    handleArchive,
    handleReactivate,
    handleSave,
  };
}
