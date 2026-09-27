import React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PackageOpen,
  Search,
  ChevronRight,
  Flower,
  Droplets,
  Zap,
  Box,
} from "lucide-react";
import { type Inventory } from "@/lib/validations/schemas";
import { Input } from "@/components/ui/input";
import { drxCopy } from "@/lib/copy/drx";

interface InventoryListProps {
  inventory: Inventory[];
  onEdit: (item: Inventory) => void;
  onAddItem: () => void;
  onArchive?: (item: Inventory) => void;
  onReactivate?: (item: Inventory) => void;
  viewStatus?: "active" | "archived";
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const getProductIcon = (category?: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("flower"))
    return <Flower className="h-5 w-5 text-accent" />;
  if (cat.includes("concentrate") || cat.includes("wax"))
    return <Droplets className="h-5 w-5 text-info" />;
  if (cat.includes("cartridge") || cat.includes("vape"))
    return <Zap className="h-5 w-5 text-warning" />;
  return <Box className="w-5 h-5 text-blue-400" />;
};

const getCategoryColor = (category?: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("flower")) return "bg-accent/10 text-accent";
  if (cat.includes("concentrate")) return "bg-info/10 text-info";
  if (cat.includes("cartridge")) return "bg-warning/10 text-warning";
  return "bg-blue-500/10 text-blue-400";
};

export function InventoryList({
  inventory,
  onEdit,
  onAddItem,
  onArchive,
  onReactivate,
  viewStatus = "active",
  searchTerm,
  onSearchChange,
}: InventoryListProps) {
  const normalizedSearch = searchTerm.toLowerCase();
  const filteredInventory = (Array.isArray(inventory) ? inventory : []).filter(
    (item) =>
      String(item?.product_name ?? "").toLowerCase().includes(normalizedSearch) ||
      String(item?.sku ?? "").toLowerCase().includes(normalizedSearch) ||
      String(item?.barcode ?? "").toLowerCase().includes(normalizedSearch),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
          {drxCopy.inventory.searchLabel}
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={drxCopy.inventory.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#1a1a1a] border-white/5 pl-9 h-12 rounded-lg focus:bg-[#1a1a1a] focus:ring-1 focus:ring-white/10"
          />
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={PackageOpen}
            title={
              viewStatus === "archived"
                ? "No archived products"
                : drxCopy.inventory.emptyTitle
            }
            description={
              viewStatus === "archived"
                ? "Products you archive will appear here."
                : drxCopy.inventory.emptyBody
            }
            actionLabel={viewStatus === "active" ? drxCopy.inventory.addItem : undefined}
            onAction={viewStatus === "active" ? onAddItem : undefined}
            className="bg-transparent border-none"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-2">
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity_on_hand <= item.reorder_level;
              return (
                <div
                  key={item.id}
                  className="bg-[#1a1a1a] border border-white/5 rounded-lg p-4 flex items-center justify-between hover:border-white/10 hover:bg-white/[0.02] transition-colors relative overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div
                      className={`h-10 w-10 rounded-lg ${getCategoryColor(item.category)} flex items-center justify-center`}
                    >
                      {getProductIcon(item.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          {item.product_name}
                        </h4>
                        {item.is_active === false && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted/40 text-muted-foreground uppercase tracking-wide">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                          {item.category || drxCopy.inventory.uncategorized}
                        </span>
                        {isLowStock && item.is_active !== false && (
                          <span className="text-[10px] font-bold tracking-wider text-red-500 uppercase flex items-center gap-1">
                            • {drxCopy.inventory.lowStock}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground/60">
                          {item.sku}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    {item.is_active === false ? (
                      onReactivate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReactivate(item);
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"
                        >
                          Reactivate
                        </button>
                      )
                    ) : (
                      onArchive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(item);
                          }}
                          className="text-xs px-2.5 py-1 rounded border border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors font-medium"
                        >
                          Archive
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      aria-label="Edit product"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
