"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, PackageOpen } from "lucide-react";
import { useRealtimeInventory } from "@/lib/hooks/use-realtime";
import { useBusiness } from "@/lib/hooks/use-business";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DataSyncStatus } from "@/components/ui/data-sync-status";

export function SearchView() {
  const { business } = useBusiness();
  const { inventory, syncStatus, refresh } = useRealtimeInventory(
    business?.id || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "low_stock" | "flower" | "concentrate"
  >("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasSearch = debouncedQuery.trim().length > 0 || activeFilter !== "all";

  const getFilteredItems = () => {
    let items = inventory;

    // Apply category/status filters first
    if (activeFilter === "low_stock") {
      items = items.filter(
        (i) => i.quantity_on_hand !== null && i.quantity_on_hand <= 10,
      ); // Assuming 10 is low stock threshold
    } else if (activeFilter === "flower") {
      items = items.filter((i) => i.category?.toLowerCase() === "flower");
    } else if (activeFilter === "concentrate") {
      items = items.filter((i) => i.category?.toLowerCase() === "concentrate");
    }

    // Apply search query
    if (debouncedQuery.trim().length > 0) {
      const query = debouncedQuery.toLowerCase();
      items = items.filter((item) => {
        return (
          item.product_name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          (item.barcode && item.barcode.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query))
        );
      });
    }

    return items;
  };

  const filteredItems = hasSearch ? getFilteredItems() : [];

  const filters = [
    { id: "all", label: "ALL ITEMS" },
    { id: "low_stock", label: "LOW STOCK", icon: true },
    { id: "flower", label: "FLOWER" },
    { id: "concentrate", label: "CONCENTRATE" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DataSyncStatus status={syncStatus} onRefresh={() => void refresh()} />
      </div>
      {/* Search Header */}
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              autoFocus
              className="h-14 pl-12 text-lg bg-muted/50 border-input shadow-sm focus-visible:ring-accent rounded-xl"
              placeholder="Search by name or alias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all whitespace-nowrap border",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {filter.icon && (
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    activeFilter === filter.id ? "bg-white" : "bg-red-500",
                  )}
                />
              )}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results or Empty State */}
      <div className="max-w-4xl mx-auto w-full">
        {!hasSearch ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
            <div className="p-4 bg-muted/30 rounded-full">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                Search by product name or alias to begin
              </p>
              <p className="text-sm text-muted-foreground">
                Enter a term above to find inventory items.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground px-1">
              {filteredItems.length} result
              {filteredItems.length !== 1 ? "s" : ""}
            </h3>

            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <PackageOpen className="w-8 h-8 mb-2 opacity-50" />
                <p>No products found matching &quot;{debouncedQuery}&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className="hover:border-accent/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-lg">
                            {item.product_name}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono mt-1">
                            {item.sku}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {item.category && (
                              <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {item.quantity_on_hand}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {item.unit_of_measure}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            in stock
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
