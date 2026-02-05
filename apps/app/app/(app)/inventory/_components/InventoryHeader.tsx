import React from "react";
import { ArrowUp, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface InventoryHeaderProps {
  onIntake: () => void;
  onAdjustment: () => void;
}

export function InventoryHeader({ onAdjustment }: InventoryHeaderProps) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        Select Operation Type
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Intake Card */}
        <Link href="/inventory/intake" className="block group">
          <Card className="bg-[#1a1a1a] border-white/5 hover:border-[#4ADE80]/50 transition-all duration-300 relative overflow-hidden group-hover:bg-[#4ADE80]/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="h-8 w-8 rounded-full bg-[#4ADE80]/20 flex items-center justify-center mb-3 text-[#4ADE80] group-hover:scale-110 transition-transform">
                  <ArrowUp className="w-5 h-5" />
                </div>
                <h3 className="text-[#4ADE80] font-bold tracking-wide text-sm">
                  INTAKE
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Add inventory stock
                </p>
              </div>
            </CardContent>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#4ADE80]/0 to-[#4ADE80]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        </Link>

        {/* Adjustment Card */}
        <button onClick={onAdjustment} className="block w-full text-left group">
          <Card className="bg-[#1a1a1a] border-white/5 hover:border-[#3B82F6]/50 transition-all duration-300 relative overflow-hidden group-hover:bg-[#3B82F6]/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="h-8 w-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mb-3 text-[#3B82F6] group-hover:scale-110 transition-transform">
                  <PenLine className="w-5 h-5" />
                </div>
                <h3 className="text-white font-bold tracking-wide text-sm">
                  ADJUSTMENT
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Manual correction
                </p>
              </div>
            </CardContent>
            <div className="absolute inset-0 bg-gradient-to-r from-[#3B82F6]/0 to-[#3B82F6]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        </button>
      </div>
    </div>
  );
}
