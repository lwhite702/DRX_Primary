"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
} from "lucide-react";

interface SnapshotMetric {
  id: string;
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: any;
}

interface SnapshotProps {
  metrics?: SnapshotMetric[];
  className?: string;
}

export function OperatorSnapshot({ metrics = [], className }: SnapshotProps) {
  const displayMetrics = metrics.length > 0 ? metrics : DEFAULT_METRICS;

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex flex-col gap-1 mb-6">
        <h2 className="headline-text text-lg">Operator Snapshot</h2>
        <p className="text-muted-foreground text-sm">
          Overview of key performance indicators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMetrics.map((metric) => (
          <div
            key={metric.id}
            className="p-4 rounded-lg border border-border bg-background/50 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {metric.label}
              </span>
              <metric.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight">
                {metric.value}
              </div>
              <div
                className={cn("flex items-center gap-1 text-xs mt-1", {
                  "text-green-500": metric.trend === "up",
                  "text-red-500": metric.trend === "down",
                  "text-muted-foreground": metric.trend === "neutral",
                })}
              >
                {metric.trend === "up" && <TrendingUp className="w-3 h-3" />}
                {metric.trend === "down" && (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{metric.trendValue}</span>
                <span className="text-muted-foreground ml-1">vs yesterday</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const DEFAULT_METRICS: SnapshotMetric[] = [
  {
    id: "sales",
    label: "Net Sales",
    value: "$4,231.50",
    trend: "up",
    trendValue: "+12.5%",
    icon: DollarSign,
  },
  {
    id: "orders",
    label: "Orders",
    value: "42",
    trend: "up",
    trendValue: "+8.2%",
    icon: ShoppingBag,
  },
  {
    id: "customers",
    label: "Customers",
    value: "18",
    trend: "neutral",
    trendValue: "0.0%",
    icon: Users,
  },
  {
    id: "returns",
    label: "Returns",
    value: "$120.00",
    trend: "down", // Down is bad here? Context matters. Usually red means "attention needed" or "bad". High returns are bad.
    trendValue: "+2.0%",
    icon: TrendingDown,
  },
];
