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
import { Tour } from "@/components/ui/tour";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen } from "lucide-react";

export default function InventoryPage() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();
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

  if (businessLoading) {
    return <AppPageSkeleton rows={5} />;
  }

  if (!business) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Finish business setup"
        description={drxCopy.inventory.missingBusiness}
        actionLabel="Continue setup"
        onAction={() => router.push("/onboarding")}
        className="m-4 md:m-8"
      />
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 page-transition">
      <div id="tour-inventory-header">
        <PageHeader title={drxCopy.inventory.title} description={drxCopy.inventory.description} />
      </div>

      <div id="tour-inventory-ops">
        <InventoryHeader
          onIntake={() => router.push("/inventory/intake")}
          onAdjustment={() => router.push("/inventory/adjust")}
          onAudit={() => router.push("/inventory/audit")}
        />
      </div>

      <div id="tour-inventory-list">
        <InventoryList
          inventory={inventory}
          onAddItem={handleAdd}
          onEdit={handleEdit}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

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
            isFirstProduct={inventory.length === 0}
          />
        </DialogContent>
      </Dialog>

      <Tour
        tourId="inventory_v1"
        onComplete={() => {}}
        steps={[
          {
            targetId: "tour-inventory-header",
            title: "Your inventory.",
            description: "Track what you have, what moved, and what needs a reup. All in one place.",
          },
          {
            targetId: "tour-inventory-ops",
            title: "Stock operations.",
            description: "Intake new stock, fix counts with an adjustment, or pull up the audit log to see every change.",
          },
          {
            targetId: "tour-inventory-list",
            title: "Your products.",
            description: "Every product lives here. Search by name or SKU. Low stock gets flagged automatically.",
          },
        ]}
      />
    </div>
  );
}
