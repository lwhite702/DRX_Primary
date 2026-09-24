"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBusiness } from "@/lib/hooks/use-business";

import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";

interface EventDeskMetrics {
  totalSales: number;
  salesCount: number;
  averageSale: number;
  inventoryAlerts: number;
  pendingIntakes: number;
  activeCustomers: number;
  creditOutstanding: number;
  recentIntakes: any[];
  lowStockItems: any[];
}

export default function EventDeskPage() {
  const { business, loading: businessLoading } = useBusiness();
  const [metrics, setMetrics] = useState<EventDeskMetrics>({
    totalSales: 0,
    salesCount: 0,
    averageSale: 0,
    inventoryAlerts: 0,
    pendingIntakes: 0,
    activeCustomers: 0,
    creditOutstanding: 0,
    recentIntakes: [],
    lowStockItems: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business?.id) {
      loadEventDeskData();
    }
  }, [business?.id]);

  const loadEventDeskData = async () => {
    if (!business?.id) return;

    try {
      setLoading(true);

      // Fetch all event desk data concurrently
      const [baselineResponse, inventoryResponse, customerResponse] = await Promise.all([
        fetch("/api/reports/pos-baseline", { credentials: "same-origin" }),
        fetch("/api/inventory?limit=200", { credentials: "same-origin" }),
        fetch("/api/customers?limit=200", { credentials: "same-origin" }),
      ]);
      const baseline = await baselineResponse.json();
      const inventory = await inventoryResponse.json();
      const customers = await customerResponse.json();
      const totalSales = Number(baseline.today?.salesTotal ?? 0);
      const salesCount = Number(baseline.today?.salesCount ?? 0);
      const averageSale = salesCount > 0 ? totalSales / salesCount : 0;
      const lowStockItems = Array.isArray(baseline.lowStock?.items) ? baseline.lowStock.items : [];
      const creditOutstanding = Number(baseline.credit?.outstandingBalance ?? 0);

      setMetrics({
        totalSales,
        salesCount,
        averageSale,
        inventoryAlerts: lowStockItems.length,
        pendingIntakes: 0,
        activeCustomers: Array.isArray(customers.data) ? customers.data.length : 0,
        creditOutstanding,
        recentIntakes: [],
        lowStockItems: lowStockItems.length ? lowStockItems : (Array.isArray(inventory.data) ? inventory.data.slice(0, 5) : []),
      });
    } catch (error) {
      console.error("Failed to load insights data:", error);
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
          Real-time business metrics and alerts
        </p>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Today's Sales
          </h3>
          <p className="text-3xl font-bold mt-2">
            ${(metrics?.totalSales ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.salesCount ?? 0} transactions
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Average Sale
          </h3>
          <p className="text-3xl font-bold mt-2">
            ${(metrics?.averageSale ?? 0).toFixed(2)}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Inventory Alerts
          </h3>
          <p className="text-3xl font-bold mt-2">{metrics.inventoryAlerts}</p>
          {metrics.inventoryAlerts > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              Items need restocking
            </p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending Intakes
          </h3>
          <p className="text-3xl font-bold mt-2">{metrics.pendingIntakes}</p>
          {metrics.pendingIntakes > 0 && (
            <p className="text-xs text-yellow-600 mt-1">Awaiting approval</p>
          )}
        </Card>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Recent Intakes</h2>
          {metrics.recentIntakes.length === 0 ? (
            <p className="text-muted-foreground mt-4">No recent intakes</p>
          ) : (
            <div className="mt-4 space-y-3">
              {metrics.recentIntakes.map((intake) => (
                <div
                  key={intake.id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">
                      {intake.inventory?.product_name || "Unknown Product"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(intake.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ${(intake.total_cost || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {intake.total_weight_grams}g
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold">Low Stock Alerts</h2>
          {metrics.lowStockItems.length === 0 ? (
            <p className="text-muted-foreground mt-4">No low stock items</p>
          ) : (
            <div className="mt-4 space-y-3">
              {metrics.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {item.quantity_on_hand}g
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reorder: {item.reorder_level}g
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
