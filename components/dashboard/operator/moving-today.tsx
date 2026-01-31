"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovingItem {
  id: string;
  type: "shipment" | "low_stock" | "return";
  title: string;
  subtitle: string;
  severity: "default" | "warning" | "destructive";
  time: string;
}

interface MovingTodayProps {
  items?: MovingItem[];
  className?: string;
}

export function MovingToday({ items = [], className }: MovingTodayProps) {
  // Default items if none provided (for dev/demo)
  const displayItems = items.length > 0 ? items : DEFAULT_MOVING_ITEMS;

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex flex-col gap-1 mb-6">
        <h2 className="headline-text text-lg">What&apos;s Moving Today</h2>
        <p className="text-muted-foreground text-sm">
          Real-time snapshot of your operation.
        </p>
      </div>

      <div className="space-y-3">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-md bg-background border border-border",
                  {
                    "text-blue-400": item.type === "shipment",
                    "text-yellow-400": item.type === "low_stock",
                    "text-red-400": item.type === "return",
                  },
                )}
              >
                {item.type === "shipment" && <Truck className="w-4 h-4" />}
                {item.type === "low_stock" && <Package className="w-4 h-4" />}
                {item.type === "return" && <AlertCircle className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-medium text-sm leading-none">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">
                {item.time}
              </span>
              {item.severity !== "default" && (
                <div
                  className={cn("w-2 h-2 rounded-full", {
                    "bg-yellow-500": item.severity === "warning",
                    "bg-red-500": item.severity === "destructive",
                  })}
                />
              )}
            </div>
          </div>
        ))}

        {displayItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No activity requiring attention.
          </div>
        )}
      </div>
    </Card>
  );
}

const DEFAULT_MOVING_ITEMS: MovingItem[] = [
  {
    id: "1",
    type: "shipment",
    title: "Inbound Delivery #8821",
    subtitle: "Arriving 2:00 PM • McKesson",
    severity: "default",
    time: "2h 15m",
  },
  {
    id: "2",
    type: "low_stock",
    title: "Low Stock: Amoxicillin 500mg",
    subtitle: "2 bottles remaining • Reorder needed",
    severity: "warning",
    time: "Now",
  },
  {
    id: "3",
    type: "return",
    title: "Pending Return #9923",
    subtitle: "Customer awaiting refund approval",
    severity: "destructive",
    time: "5m ago",
  },
];
