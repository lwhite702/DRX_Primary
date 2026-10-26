"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBusiness } from "@/lib/hooks/use-business";
import { formatCurrency } from "@/lib/utils";

import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";

interface EventDeskMetrics {
  totalSales: number | null;
  salesCount: number | null;
  averageSale: number | null;
  inventoryAlerts: number | null;
  pendingIntakes: number;
  activeCustomers: number;
  creditOutstanding: number;
  recentIntakes: any[];
  lowStockItems: any[] | null;
  expiringBatches: any[];
}

export default function EventDeskPage() {
  const { business, loading: businessLoading } = useBusiness();
  const [metrics, setMetrics] = useState<EventDeskMetrics>({
    totalSales: null,
    salesCount: null,
    averageSale: null,
    inventoryAlerts: null,
    pendingIntakes: 0,
    activeCustomers: 0,
    creditOutstanding: 0,
    recentIntakes: [],
    lowStockItems: null,
    expiringBatches: [],
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

      // Fetch all event desk data concurrently
      const [
        baselineResponse,
        inventoryResponse,
        customerResponse,
        pendingIntakesResponse,
        approvedIntakesResponse,
        expiringBatchesResponse,
      ] = await Promise.all([
        fetch("/api/reports/pos-baseline", { credentials: "same-origin" }).catch(() => null),
        fetch("/api/inventory?limit=200", { credentials: "same-origin" }).catch(() => null),
        fetch("/api/customers?limit=200", { credentials: "same-origin" }).catch(() => null),
        fetch("/api/inventory/intake?status=pending", { credentials: "same-origin" }).catch(() => null),
        fetch("/api/inventory/intake?status=approved", { credentials: "same-origin" }).catch(() => null),
        fetch("/api/inventory/batches/expiring?days=30", { credentials: "same-origin" }).catch(() => null),
      ]);

      if (!baselineResponse || !baselineResponse.ok) {
        throw new Error("Could not load current reporting metrics.");
      }

      const baseline = await baselineResponse.json().catch(() => ({}));
      const inventory = inventoryResponse?.ok ? await inventoryResponse.json().catch(() => ({})) : {};
      const customers = customerResponse?.ok ? await customerResponse.json().catch(() => ({})) : {};
      const pendingIntakesData = pendingIntakesResponse?.ok ? await pendingIntakesResponse.json().catch(() => ({})) : {};
      const approvedIntakesData = approvedIntakesResponse?.ok ? await approvedIntakesResponse.json().catch(() => ({})) : {};
      const expiringBatchesData = expiringBatchesResponse?.ok ? await expiringBatchesResponse.json().catch(() => ({})) : {};

      const totalSales = typeof baseline.today?.salesTotal === "number" ? baseline.today.salesTotal : null;
      const salesCount = typeof baseline.today?.salesCount === "number" ? baseline.today.salesCount : null;
      const averageSale = salesCount === 0 ? null : typeof baseline.today?.averageOrderValue === "number" ? baseline.today.averageOrderValue : null;
      const lowStockItems = Array.isArray(baseline.lowStock?.items) ? baseline.lowStock.items : [];
      const inventoryAlerts = typeof baseline.lowStock?.count === "number" ? baseline.lowStock.count : null;
      const creditOutstanding = Number(baseline.credit?.outstandingBalance ?? 0);

      const pendingCount = Array.isArray(pendingIntakesData.items) ? pendingIntakesData.items.length : 0;
      const recentIntakes = Array.isArray(approvedIntakesData.items) ? approvedIntakesData.items.slice(0, 5) : [];
      const expiringBatches = Array.isArray(expiringBatchesData.batches) ? expiringBatchesData.batches.slice(0, 5) : [];

      setMetrics({
        totalSales,
        salesCount,
        averageSale,
        inventoryAlerts,
        pendingIntakes: pendingCount,
        activeCustomers: Array.isArray(customers.data) ? customers.data.length : 0,
        creditOutstanding,
        recentIntakes,
        lowStockItems: inventoryAlerts === null ? null : lowStockItems,
        expiringBatches,
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
          <p className="text-3xl font-bold mt-2">{metrics.pendingIntakes}</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
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
                      {intake.product_name || intake.inventory?.product_name || "Product Intake"}
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
                      {intake.total_weight_grams}{intake.unit_of_measure || "g"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    <p className="font-medium">{item.name || item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {item.quantityOnHand ?? item.quantity_on_hand}{item.selling_unit || item.unit_of_measure || "g"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reorder: {item.lowStockThreshold ?? item.reorder_level}{item.selling_unit || item.unit_of_measure || "g"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">Expiring Batches (Next 30 Days)</h2>
          {metrics.expiringBatches.length === 0 ? (
            <p className="text-muted-foreground mt-4">No batches expiring in the next 30 days</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {metrics.expiringBatches.map((batch) => (
                <div
                  key={batch._id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{batch.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {batch.lotNumber ? `Lot: ${batch.lotNumber} • ` : ""}
                      Expires: {batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-500">
                      {batch.remainingQuantityGrams}g remaining
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${((batch.unitCostPerGramCents || 0) / 100).toFixed(2)}/g
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
