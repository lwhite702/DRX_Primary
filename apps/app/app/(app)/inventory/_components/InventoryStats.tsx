import React from "react";
import { AlertTriangle } from "lucide-react";

interface InventoryStatsProps {
  lowStockCount: number;
}

export function InventoryStats({ lowStockCount }: InventoryStatsProps) {
  if (lowStockCount === 0) return null;

  return (
    <div className="relative z-10 p-4 rounded-xl bg-gradient-to-r from-[#FF0099]/10 to-transparent border border-[#FF0099]/30 shadow-lg shadow-[#FF0099]/10">
      <div className="flex items-center gap-2 text-[#FF0099]">
        <AlertTriangle className="h-5 w-5" />
        <p className="font-medium">
          {lowStockCount} item(s) below reorder level
        </p>
      </div>
    </div>
  );
}
