"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createAppClient } from "@/lib/data/client/supabase-client";
import { TrendingUp, TrendingDown, Minus, Package, Truck } from "lucide-react";
import { format } from "date-fns";

interface CostHistoryEntry {
  id: string;
  cost_per_gram: number;
  total_cost: number;
  total_weight_grams: number;
  delivery_cost: number;
  supplier: string | null;
  created_at: string;
}

interface ProductCostBreakdownProps {
  inventoryId: string;
  productName: string;
}

export function ProductCostBreakdown({
  inventoryId,
  productName,
}: ProductCostBreakdownProps) {
  const [loading, setLoading] = useState(true);
  const [costHistory, setCostHistory] = useState<CostHistoryEntry[]>([]);
  const [latestCost, setLatestCost] = useState<CostHistoryEntry | null>(null);
  const supabase = createAppClient();

  useEffect(() => {
    loadCostData();
  }, [inventoryId]);

  const loadCostData = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("cost_history")
        .select("*")
        .eq("inventory_id", inventoryId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        setCostHistory(data);
        setLatestCost(data[0]);
      }
    } catch (error) {
      console.error("Error loading cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = () => {
    if (costHistory.length < 2) return { direction: "stable", change: 0 };

    const latest = costHistory[0].cost_per_gram;
    const previous = costHistory[1].cost_per_gram;
    const change = ((latest - previous) / previous) * 100;

    if (Math.abs(change) < 2) return { direction: "stable", change: 0 };
    return { direction: change > 0 ? "up" : "down", change };
  };

  const trend = calculateTrend();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!latestCost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No cost history available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cost Breakdown</span>
          {trend.direction !== "stable" && (
            <Badge
              variant={trend.direction === "up" ? "destructive" : "default"}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(trend.change).toFixed(1)}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Latest Intake Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Latest Intake
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">
                {format(new Date(latestCost.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="text-sm font-medium">
                {latestCost.supplier || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-sm font-medium">
                ${latestCost.total_cost.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Weight</p>
              <p className="text-sm font-medium">
                {latestCost.total_weight_grams.toFixed(2)}g
              </p>
            </div>
          </div>

          <div className="bg-primary/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Cost Per Gram</span>
              </div>
              <span className="text-lg font-bold font-mono text-primary">
                ${latestCost.cost_per_gram.toFixed(6)}/g
              </span>
            </div>
          </div>

          {latestCost.delivery_cost > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span className="text-sm font-semibold">Delivery Cost</span>
                </div>
                <span className="text-sm font-bold">
                  ${latestCost.delivery_cost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tracked separately, not included in cost/gram
              </p>
            </div>
          )}
        </div>

        {/* Cost History Timeline */}
        {costHistory.length > 1 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Cost History
            </h3>
            <div className="space-y-2">
              {costHistory.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy")}
                    </p>
                    {entry.supplier && (
                      <p className="text-xs text-muted-foreground">
                        {entry.supplier}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium">
                        ${entry.cost_per_gram.toFixed(6)}/g
                      </p>
                      {entry.delivery_cost > 0 && (
                        <p className="text-xs text-muted-foreground">
                          +${entry.delivery_cost.toFixed(2)} delivery
                        </p>
                      )}
                    </div>
                    {index < costHistory.length - 1 && (
                      <div className="w-6">
                        {entry.cost_per_gram >
                        costHistory[index + 1].cost_per_gram ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : entry.cost_per_gram <
                          costHistory[index + 1].cost_per_gram ? (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
