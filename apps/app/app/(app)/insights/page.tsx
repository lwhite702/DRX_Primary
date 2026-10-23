"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBusiness } from "@/lib/hooks/use-business";
import { formatCurrency } from "@/lib/utils";

import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";

interface LowStockItem { id: string; name: string; sku: string; quantityOnHand: number; lowStockThreshold: number }

interface EventDeskMetrics {
  totalSales: number | null;
  salesCount: number | null;
  averageSale: number | null;
  inventoryAlerts: number | null;
  lowStockItems: LowStockItem[] | null;
}

export default function EventDeskPage() {
  const { business, loading: businessLoading } = useBusiness();
  const [metrics, setMetrics] = useState<EventDeskMetrics>({
    totalSales: null,
    salesCount: null,
    averageSale: null,
    inventoryAlerts: null,
    lowStockItems: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (business?.id) {
      loadEventDeskData();
    }
  }, [business?.id]);

  const loadEventDeskData = async () => {
    if (!business?.id) return;

    try {
      setLoading(true);
      setLoadError(null);
      setMetrics({ totalSales: null, salesCount: null, averageSale: null, inventoryAlerts: null, lowStockItems: null });
      const baselineResponse = await fetch("/api/reports/pos-baseline", { credentials: "same-origin" });
      if (!baselineResponse.ok) throw new Error("Could not load current reporting metrics.");
      const baseline = await baselineResponse.json();
      const totalSales = typeof baseline.today?.salesTotal === "number" ? baseline.today.salesTotal : null;
      const salesCount = typeof baseline.today?.salesCount === "number" ? baseline.today.salesCount : null;
      const averageSale = salesCount === 0 ? null : typeof baseline.today?.averageOrderValue === "number" ? baseline.today.averageOrderValue : null;
      const lowStockItems = Array.isArray(baseline.lowStock?.items) ? baseline.lowStock.items : [];

      const inventoryAlerts = typeof baseline.lowStock?.count === "number" ? baseline.lowStock.count : null;
      setMetrics({
        totalSales,
        salesCount,
        averageSale,
        inventoryAlerts,
        lowStockItems: inventoryAlerts === null ? null : lowStockItems,
      });
    } catch (error) {
      console.error("Failed to load insights data:", error);
      setLoadError("Could not load current reporting metrics. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading || loading) {
    return <AppPageSkeleton rows={4} className="animate-in fade-in-0 duration-200" />;
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8 text-muted-foreground text-center">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-0 duration-200">
      <div>
        <h1 className="text-3xl font-bold">Operations Insights</h1>
        <p className="text-muted-foreground mt-2">
          Business-local sales totals and inventory alerts
        </p>
      </div>

      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Today's Sales
          </h3>
          <p className="text-3xl font-bold mt-2">
            {metrics.totalSales === null ? "—" : formatCurrency(metrics.totalSales)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.salesCount === null ? "Transaction count unavailable" : `${metrics.salesCount} transactions`}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Average Sale
          </h3>
          <p className="text-3xl font-bold mt-2">
            {metrics.averageSale === null ? "—" : formatCurrency(metrics.averageSale)}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Inventory Alerts
          </h3>
          <p className="text-3xl font-bold mt-2">{metrics.inventoryAlerts ?? "—"}</p>
          {metrics.inventoryAlerts !== null && metrics.inventoryAlerts > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              Items need restocking
            </p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending Intakes
          </h3>
          <p className="text-3xl font-bold mt-2">—</p>
          <p className="text-xs text-muted-foreground mt-1">Intake count unavailable</p>
        </Card>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Recent Intakes</h2>
          <p className="text-muted-foreground mt-4">Intake activity is unavailable.</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold">Low Stock Alerts</h2>
          {metrics.lowStockItems === null ? (
            <p className="text-muted-foreground mt-4">Inventory count is unavailable.</p>
          ) : metrics.lowStockItems.length === 0 ? (
            <p className="text-muted-foreground mt-4">No low stock items</p>
          ) : (
            <div className="mt-4 space-y-3">
              {metrics.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {item.quantityOnHand}g
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reorder: {item.lowStockThreshold}g
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
