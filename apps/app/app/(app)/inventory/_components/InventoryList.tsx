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

interface InventoryListProps {
  inventory: Inventory[];
  onEdit: (item: Inventory) => void;
  // onViewCost removed as unused for now
  onAddItem: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const getProductIcon = (category?: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("flower"))
    return <Flower className="w-5 h-5 text-purple-400" />;
  if (cat.includes("concentrate") || cat.includes("wax"))
    return <Droplets className="w-5 h-5 text-yellow-400" />;
  if (cat.includes("cartridge") || cat.includes("vape"))
    return <Zap className="w-5 h-5 text-orange-400" />;
  return <Box className="w-5 h-5 text-blue-400" />;
};

const getCategoryColor = (category?: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("flower")) return "bg-purple-500/10 text-purple-400";
  if (cat.includes("concentrate")) return "bg-yellow-500/10 text-yellow-400";
  if (cat.includes("cartridge")) return "bg-orange-500/10 text-orange-400";
  return "bg-blue-500/10 text-blue-400";
};

export function InventoryList({
  inventory,
  onEdit,
  onAddItem,
  searchTerm,
  onSearchChange,
}: InventoryListProps) {
  const filteredInventory = inventory.filter(
    (item) =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
          Select Product
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or alias..."
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
            title="No products found"
            description="Try a different search term or add a new item."
            actionLabel="Add Item"
            onAction={onAddItem}
            className="bg-transparent border-none"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mobile/Card List (Default for this new UI) */}
          <div className="space-y-2">
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity_on_hand <= item.reorder_level;
              return (
                <button
                  key={item.id}
                  onClick={() => onEdit(item)}
                  className="w-full text-left group"
                >
                  <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-4 flex items-center justify-between hover:border-white/10 hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg ${getCategoryColor(item.category)} flex items-center justify-center`}
                      >
                        {getProductIcon(item.category)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {item.product_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            {item.category || "UNCATEGORIZED"}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] font-bold tracking-wider text-red-500 uppercase flex items-center gap-1">
                              • LOW STOCK
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            {item.sku}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
