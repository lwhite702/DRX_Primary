import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen, DollarSign, Edit } from "lucide-react";
import { type Inventory } from "@/lib/validations/schemas"; // Assuming this type exists as per original code

interface InventoryListProps {
  inventory: Inventory[]; // Use strict type if possible, or any if schemas not available yet
  onEdit: (item: Inventory) => void;
  onViewCost: (item: Inventory) => void;
  onAddItem: () => void;
}

export function InventoryList({
  inventory,
  onEdit,
  onViewCost,
  onAddItem,
}: InventoryListProps) {
  if (inventory.length === 0) {
    return (
      <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border relative z-10">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#FF0099] shadow-[0_0_10px_#FF0099]" />
          <h2 className="headline-text text-lg tracking-wider text-[#FF0099]">
            PRODUCT LIST
          </h2>
        </div>
        <CardContent className="p-0">
          <EmptyState
            icon={PackageOpen}
            title="No products"
            description="Add your first product to start tracking inventory."
            actionLabel="Add Item"
            onAction={onAddItem}
          />
        </CardContent>
      </div>
    );
  }

  return (
    <div className="luminosity-card rounded-xl bg-card/50 backdrop-blur-sm border-border relative z-10">
      <div className="p-6 border-b border-white/5 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#FF0099] shadow-[0_0_10px_#FF0099]" />
        <h2 className="headline-text text-lg tracking-wider text-[#FF0099]">
          PRODUCT LIST
        </h2>
      </div>
      <CardContent className="p-0">
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {inventory.map((item) => {
            const isLowStock = item.quantity_on_hand <= item.reorder_level;
            return (
              <div
                key={item.id}
                className={`
                  p-4 border-b border-white/5 last:border-0 hover:bg-[#FF0099]/5 transition-colors
                  ${isLowStock ? "bg-red-500/5 border-l-2 border-l-red-500" : ""}
                `}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {item.product_name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono">{item.sku}</span>
                        {item.category ? ` • ${item.category}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewCost(item)}
                        aria-label="View cost breakdown"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        aria-label="Edit item"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p
                        className={
                          isLowStock
                            ? "font-bold text-destructive"
                            : "font-medium"
                        }
                      >
                        {item.quantity_on_hand}
                        {item.unit_of_measure || "g"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Reorder Level
                      </p>
                      <p className="font-medium">{item.reorder_level}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unit Cost</p>
                      <p className="font-medium">
                        {item.unit_cost
                          ? "$" + Number(item.unit_cost).toFixed(2)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Selling Price
                      </p>
                      <p className="font-medium">
                        {item.selling_price
                          ? "$" + Number(item.selling_price).toFixed(2)
                          : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  SKU
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Product Name
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Category
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Stock
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Reorder
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Cost
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Price
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const isLowStock = item.quantity_on_hand <= item.reorder_level;
                return (
                  <TableRow
                    key={item.id}
                    className={`
                      border-white/5 hover:bg-[#FF0099]/5 transition-colors group
                      ${isLowStock ? "bg-red-500/5" : ""}
                    `}
                  >
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell className="font-medium">
                      {item.product_name}
                    </TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={
                          isLowStock ? "text-destructive font-bold" : ""
                        }
                      >
                        {item.quantity_on_hand}
                        {item.unit_of_measure || "g"}
                      </span>
                    </TableCell>
                    <TableCell>{item.reorder_level}</TableCell>
                    <TableCell>
                      {item.unit_cost
                        ? "$" + Number(item.unit_cost).toFixed(2)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[#FF0099] font-bold">
                        {item.selling_price
                          ? "$" + Number(item.selling_price).toFixed(2)
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewCost(item)}
                          title="View cost breakdown"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </div>
  );
}
