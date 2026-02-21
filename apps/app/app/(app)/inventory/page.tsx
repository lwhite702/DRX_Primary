"use client";

import React, { useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { useInventoryActions } from "./_hooks/useInventoryActions";
import { PageHeader } from "@/components/ui/page-header";
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

import { useRouter } from "next/navigation";
import { drxCopy } from "@/lib/copy/drx";

export default function InventoryPage() {
  const router = useRouter();
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
        {drxCopy.inventory.missingBusiness}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 page-transition">
      <PageHeader title={drxCopy.inventory.title} description={drxCopy.inventory.description} />

      <InventoryHeader
        onIntake={() => router.push("/inventory/intake")}
        onAdjustment={() => router.push("/inventory/adjust")}
        onAudit={() => router.push("/inventory/audit")}
      />

      <InventoryList
        inventory={inventory}
        onAddItem={handleAdd}
        onEdit={handleEdit}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl bg-[#1a1a1a] border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-wide">
              {editingItem ? drxCopy.inventory.dialog.editTitle : drxCopy.inventory.dialog.addTitle}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? drxCopy.inventory.dialog.editBody : drxCopy.inventory.dialog.addBody}
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
