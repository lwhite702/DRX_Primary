"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AlertTriangle, TrendingDown, Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShrinkageReportProps {
  businessId: string;
}

export function ShrinkageReport({ businessId }: ShrinkageReportProps) {
  const supabase = getSupabaseClient();
  const [shrinkageEvents, setShrinkageEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");
  const [totalCostLoss, setTotalCostLoss] = useState(0);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!businessId || !supabase) return;

    const loadShrinkageData = async () => {
      setLoading(true);

      const daysBack = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: events, error } = await supabase
        .from("shrinkage_events")
        .select(
          `
          id,
          quantity_grams,
          cost_value,
          shrinkage_type,
          created_at,
          inventory_id,
          inventory:inventory_id(product_name, sku),
          user_id
        `
        )
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading shrinkage data:", error);
      } else {
        setShrinkageEvents(events || []);

        // Calculate totals
        const totalCost = (events || []).reduce(
          (sum: number, e: any) => sum + (e.cost_value || 0),
          0
        );
        setTotalCostLoss(totalCost);

        // Count by type
        const counts: Record<string, number> = {};
        (events || []).forEach((e: any) => {
          counts[e.shrinkage_type] = (counts[e.shrinkage_type] || 0) + 1;
        });
        setEventCounts(counts);
      }

      setLoading(false);
    };

    loadShrinkageData();
  }, [businessId, supabase, period]);

  const typeLabels: Record<string, string> = {
    personal_use: "Personal Use",
    store_use: "Store Use",
    damaged: "Damaged",
    theft: "Theft",
    sample: "Sample",
    inventory_variance: "Inventory Variance",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shrinkageEvents.length}</div>
            <p className="text-xs text-muted-foreground">Last {period} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Loss</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCostLoss.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From shrinkage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Per Event</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {shrinkageEvents.length > 0
                ? (totalCostLoss / shrinkageEvents.length).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Per shrinkage event</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Events by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(eventCounts).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {typeLabels[type] || type}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Shrinkage Events</CardTitle>
          <div className="mt-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : shrinkageEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shrinkage events recorded
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shrinkageEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {new Date(event.created_at).toLocaleDateString()}{" "}
                        {new Date(event.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p className="font-medium">
                            {event.inventory?.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.inventory?.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-muted">
                          {typeLabels[event.shrinkage_type] ||
                            event.shrinkage_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {event.quantity_grams.toFixed(2)}g
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${(event.cost_value || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
