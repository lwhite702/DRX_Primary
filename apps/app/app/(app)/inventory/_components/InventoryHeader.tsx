import React from "react";
import { ArrowUp, PenLine, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { drxCopy } from "@/lib/copy/drx";

interface InventoryHeaderProps {
  onIntake: () => void;
  onAdjustment: () => void;
  onAudit: () => void;
}

export function InventoryHeader({
  onAdjustment,
  onAudit,
}: InventoryHeaderProps) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
        {drxCopy.inventory.operationsLabel}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/inventory/intake" className="block group">
          <Card className="relative h-full overflow-hidden border-white/5 bg-card transition-all duration-200 hover:border-accent/50 group-hover:bg-accent/5">
            <CardContent className="p-6 flex flex-col items-start justify-between h-full">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-accent/20 text-accent transition-transform group-hover:scale-105">
                <ArrowUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide text-accent">
                  {drxCopy.inventory.cards.intake.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {drxCopy.inventory.cards.intake.body}
                </p>
              </div>
            </CardContent>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/0 to-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Card>
        </Link>

        <button
          onClick={onAdjustment}
          className="block w-full text-left group h-full"
        >
          <Card className="relative h-full overflow-hidden border-white/5 bg-card transition-all duration-200 hover:border-info/50 group-hover:bg-info/5">
            <CardContent className="p-6 flex flex-col items-start justify-between h-full">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-info/20 text-info transition-transform group-hover:scale-105">
                <PenLine className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-wide text-sm">
                  {drxCopy.inventory.cards.adjustment.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {drxCopy.inventory.cards.adjustment.body}
                </p>
              </div>
            </CardContent>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-info/0 to-info/5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Card>
        </button>

        <button
          onClick={onAudit}
          className="block w-full text-left group h-full"
        >
          <Card className="relative h-full overflow-hidden border-white/5 bg-card transition-all duration-200 hover:border-warning/50 group-hover:bg-warning/5">
            <CardContent className="p-6 flex flex-col items-start justify-between h-full">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-warning/20 text-warning transition-transform group-hover:scale-105">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-wide text-sm">
                  {drxCopy.inventory.cards.audit.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {drxCopy.inventory.cards.audit.body}
                </p>
              </div>
            </CardContent>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-warning/0 to-warning/5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Card>
        </button>
      </div>
    </div>
  );
}
