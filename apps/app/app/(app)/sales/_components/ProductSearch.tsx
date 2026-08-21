import { Search, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ProductSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  inventory: any[];
  onAddToCart: (item: any) => void;
  onWeightEntry: (item: any) => void;
}

export function ProductSearch({
  searchTerm,
  onSearchChange,
  inventory,
  onAddToCart,
  onWeightEntry,
}: ProductSearchProps) {
  const normalizedSearch = searchTerm.toLowerCase();
  const filteredInventory = (Array.isArray(inventory) ? inventory : []).filter(
    (item) =>
      String(item?.product_name ?? "").toLowerCase().includes(normalizedSearch) ||
      String(item?.sku ?? "").toLowerCase().includes(normalizedSearch),
  );

  return (
    <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="headline-text text-xl">INVENTORY</h2>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="SEARCH ITEM OR SKU..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 bg-muted/50 border-white/10 focus:border-accent/50 text-lg uppercase tracking-wide rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredInventory.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="NO ITEMS FOUND"
              description={
                inventory.length === 0
                  ? "Inventory is empty."
                  : "No matching items found."
              }
              className="py-12 border-dashed border-white/10 bg-transparent"
            />
          ) : (
            filteredInventory.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-4 border border-white/5 rounded-xl bg-card/30 hover:bg-accent/5 hover:border-accent/30 transition-all duration-300"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg tracking-tight">
                      {item.product_name}
                    </h3>
                    {item.quantity_on_hand <= item.reorder_level && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20 uppercase font-bold tracking-wider">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="font-mono text-xs opacity-70">
                      {item.sku}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span
                      className={
                        item.quantity_on_hand > 0
                          ? "text-accent"
                          : "text-destructive"
                      }
                    >
                      {item.base_unit === "g"
                        ? `${(
                            item.inventory_in_grams || item.quantity_on_hand
                          ).toFixed(2)}g`
                        : `${item.quantity_on_hand} units`}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="font-mono text-foreground font-bold text-base">
                      ${Number(item.selling_price || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {item.base_unit === "g" && item.inventory_in_grams > 0 && (
                    <Button
                      onClick={() => onWeightEntry(item)}
                      disabled={item.inventory_in_grams <= 0}
                      size="sm"
                      variant="secondary"
                      className="h-9 px-4 uppercase font-bold text-xs tracking-wider"
                    >
                      Scale
                    </Button>
                  )}
                  <Button
                    onClick={() => onAddToCart(item)}
                    disabled={item.quantity_on_hand <= 0}
                    size="sm"
                    className="h-9 px-6 bg-accent text-accent-foreground hover:bg-accent/90 uppercase font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(191,255,0,0.3)]"
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
