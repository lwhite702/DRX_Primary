"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBusiness } from "@/lib/hooks/use-business";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { ProductCostBreakdown } from "@/components/crm/ProductCostBreakdown";
import { Tour } from "@/components/ui/tour";

// Custom Components & Hooks
import { InventoryHeader } from "./_components/InventoryHeader";
import { InventoryStats } from "./_components/InventoryStats";
import { InventoryList } from "./_components/InventoryList";
import { InventoryForm } from "./_components/InventoryForm";
import { useInventoryActions } from "./_hooks/useInventoryActions";

export default function InventoryPage() {
  const { business, loading: businessLoading } = useBusiness();
  const inventory = useRealtimeInventory(business?.id || null);

  const {
    showDialog,
    setShowDialog,
    editingItem,
    handleNew,
    handleEdit,
    handleSave,
    showCostBreakdown,
    setShowCostBreakdown,
    selectedProduct,
    setSelectedProduct,
  } = useInventoryActions(business?.id);

  // Derived state
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

      <InventoryHeader itemCount={inventory.length} onAddItem={handleNew} />

      <InventoryStats lowStockCount={lowStockItems.length} />

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
              inventoryId={selectedProduct.id!}
              productName={selectedProduct.product_name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Item Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
          <InventoryForm
            businessId={business.id}
            initialData={editingItem}
            onSuccess={handleSave}
            onCancel={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <InventoryList
        inventory={inventory}
        onEdit={handleEdit}
        onViewCost={(item) => {
          setSelectedProduct(item);
          setShowCostBreakdown(true);
        }}
        onAddItem={handleNew}
      />

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
