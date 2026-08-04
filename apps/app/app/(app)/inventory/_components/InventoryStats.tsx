import React from "react";
import { AlertTriangle } from "lucide-react";

interface InventoryStatsProps {
  lowStockCount: number;
}

export function InventoryStats({ lowStockCount }: InventoryStatsProps) {
  if (lowStockCount === 0) return null;

  return (
    <div className="relative z-10 rounded-xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent p-4 shadow-lg shadow-warning/10">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-5 w-5" />
        <p className="font-medium">
          {lowStockCount} item(s) below reorder level
        </p>
      </div>
    </div>
  );
}
