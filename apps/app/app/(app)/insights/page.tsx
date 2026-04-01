"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";

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

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      setLoading(true);

      // Get today's date for sales filtering
      const today = new Date().toISOString().split("T")[0];

      // Fetch all event desk data concurrently
      const [
        todaySales,
        lowStockItems,
        pendingIntakes,
        activeCustomers,
        creditData,
        recentIntakes,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("total_amount")
          .eq("business_id", business.id)
          .eq("order_status", "completed")
          .gte("created_at", today),
        supabase
          .from("inventory")
          .select("id, product_name, sku, quantity_on_hand, reorder_level")
          .eq("business_id", business.id)
          .lte("quantity_on_hand", "reorder_level")
          .limit(5),
        supabase
          .from("inventory_intakes")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("status", "pending"),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("is_active", true)
          .eq("ephemeral", false),
        supabase
          .from("credit_limits")
          .select("current_balance")
          .eq("business_id", business.id),
        supabase
          .from("inventory_intakes")
          .select(
            "id, total_cost, total_weight_grams, created_at, status, inventory!inner(product_name)"
          )
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const totalSales =
        todaySales.data?.reduce(
          (sum: number, sale: { total_amount: number | null }) =>
            sum + (sale.total_amount || 0),
          0
        ) || 0;
      const salesCount = todaySales.data?.length || 0;
      const averageSale = salesCount > 0 ? totalSales / salesCount : 0;
      // Assuming 'sales' here refers to 'todaySales.data' for consistency with the original code's context
      // If 'sales' refers to a different dataset, it needs to be fetched or defined.
      // For now, I'll assume it's a typo and should be todaySales.data
      const totalRevenue =
        todaySales.data?.reduce(
          (sum: number, sale: { total_amount: number | null }) =>
            sum + (sale.total_amount || 0),
          0
        ) || 0;

      const inventoryAlerts = lowStockItems.data?.length || 0;

      // Credit stats
      // Assuming 'creditTransactions' here refers to 'creditData.data' for consistency with the original code's context
      // If 'creditTransactions' refers to a different dataset, it needs to be fetched or defined.
      // Also, the original code sums 'current_balance', while the change sums 'amount' based on 'status'.
      // I will keep the original logic for creditOutstanding as it aligns with the fetched 'credit_limits' data,
      // and add the user's requested line if it's meant to be a separate calculation,
      // but it seems to be a replacement for the existing creditOutstanding.
      // Given the instruction "Add type annotations to reduce callbacks", I will apply type annotations to the existing creditOutstanding calculation.
      const creditOutstanding =
        creditData.data?.reduce(
          (sum: number, credit: { current_balance: number | null }) =>
            sum + (credit.current_balance || 0),
          0
        ) || 0;
      // If the user intended to replace the creditOutstanding calculation with the one provided,
      // and 'creditTransactions' is meant to be 'creditData.data', then the line would be:
      // const creditOutstanding = creditData.data?.reduce((sum: number, credit: { status: string, amount: number }) => (credit.status === 'pending' ? sum + credit.amount : sum), 0) || 0;
      // However, 'credit_limits' table likely doesn't have 'status' and 'amount' fields in this context, but 'current_balance'.
      // Sticking to the original data structure and applying type annotation.

      setMetrics({
        totalSales,
        salesCount,
        averageSale,
        inventoryAlerts,
        pendingIntakes: pendingIntakes.count || 0,
        activeCustomers: activeCustomers.count || 0,
        creditOutstanding,
        recentIntakes: recentIntakes.data || [],
        lowStockItems: lowStockItems.data || [],
      });
    } catch (error) {
      console.error("Failed to load insights data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading || loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Operations Insights</h1>
          <p className="text-muted-foreground mt-2">
            Real-time business metrics and alerts
          </p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-4 md:p-8">
        No business found. Please set up your business first.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
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
            ${metrics.totalSales.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.salesCount} transactions
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Average Sale
          </h3>
          <p className="text-3xl font-bold mt-2">
            ${metrics.averageSale.toFixed(2)}
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
