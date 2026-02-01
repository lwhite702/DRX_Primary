import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link"; // Changed from <a> to Link for better Next.js routing

interface InventoryHeaderProps {
  itemCount: number;
  onAddItem: () => void;
}

export function InventoryHeader({
  itemCount,
  onAddItem,
}: InventoryHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
      <div>
        <h1 className="headline-text text-3xl tracking-widest text-muted-foreground">
          INVENTORY
        </h1>
        <p className="technical-label text-xs text-muted-foreground/60 mt-1">
          MANAGEMENT CONSOLE • {itemCount} SKUS
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/inventory/intake" className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto border-border bg-background/50 backdrop-blur hover:bg-muted/50"
          >
            <Plus className="h-4 w-4 mr-2" />
            INTAKE STOCK
          </Button>
        </Link>
        <Button
          onClick={onAddItem}
          className="w-full sm:w-auto laser-button bg-[#FF0099] text-white hover:bg-[#FF0099]/90 shadow-[0_0_15px_rgba(255,0,153,0.4)] border-none font-bold tracking-wider"
          id="tour-inventory-add-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          ADD ITEM
        </Button>
      </div>
    </div>
  );
}
