"use client";

import React, { useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { useInventoryActions } from "./_hooks/useInventoryActions";
import { InventoryHeader } from "./_components/InventoryHeader";
import { InventoryList } from "./_components/InventoryList";
import { InventoryForm } from "./_components/InventoryForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function InventoryPage() {
  const { business } = useBusiness();
  const {
    inventory,
    showDialog,
    editingItem,
    setShowDialog,
    handleAdd,
    handleEdit,
    handleSave,
  } = useInventoryActions(business?.id);

  const [searchTerm, setSearchTerm] = useState("");

  if (!business) {
    return (
      <div className="p-4 md:p-8 text-center text-muted-foreground">
        Please set up your business profile to manage inventory.
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 page-transition">
      <InventoryHeader
        onIntake={() => console.log("Navigate to Intake")} // In real app, router.push
        onAdjustment={() => console.log("Navigate to Adjustment")}
      />

      <InventoryList
        inventory={inventory}
        onAddItem={handleAdd}
        onEdit={handleEdit}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl bg-[#1a1a1a] border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-wide">
              {editingItem ? "EDIT ITEM" : "ADD NEW ITEM"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update inventory details."
                : "Add a new product to your inventory."}
            </DialogDescription>
          </DialogHeader>
          <InventoryForm
            initialData={editingItem || undefined}
            onSuccess={handleSave}
            onCancel={() => setShowDialog(false)}
            businessId={business?.id || ""}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
