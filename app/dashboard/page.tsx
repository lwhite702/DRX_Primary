"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SetupGuide } from "@/components/onboarding/setup-guide";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { PackageOpen } from "lucide-react";

interface DashboardStats {
  totalSales: number;
  activeCustomers: number;
  inventoryItems: number;
  creditOutstanding: number;
  recentActivity: any[];
}

export default function DashboardPage() {
  const { business, loading: businessLoading } = useBusiness();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    activeCustomers: 0,
    inventoryItems: 0,
    creditOutstanding: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (business?.id) {
      loadDashboardData();
    }
  }, [business?.id]);

  const loadDashboardData = async () => {
    if (!business?.id) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data concurrently
      const [
        salesData,
        activeCustomers,
        inventoryItems,
        creditData,
        recentSales,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("total_amount")
          .eq("business_id", business.id)
          .eq("order_status", "completed")
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          ),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("is_active", true),
        supabase
          .from("inventory")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id),
        supabase
          .from("credit_limits")
          .select("current_balance")
          .eq("business_id", business.id),
        supabase
          .from("sales")
          .select("id, total_amount, created_at, order_status")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const totalSales =
        salesData.data?.reduce(
          (sum: number, sale: any) => sum + (sale.total_amount || 0),
          0
        ) || 0;
      const creditOutstanding =
        creditData.data?.reduce(
          (sum: number, credit: any) => sum + (credit.current_balance || 0),
          0
        ) || 0;

      setStats({
        totalSales,
        activeCustomers: activeCustomers.count || 0,
        inventoryItems: inventoryItems.count || 0,
        creditOutstanding,
        recentActivity: recentSales.data || [],
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError(
        "Failed to load dashboard data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading || loading) {
    return <DashboardSkeleton />;
  }

  if (!business) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="No Business Found"
        description="You haven't set up a business yet. Create one to get started."
        actionLabel="Create Business"
        onAction={() => (window.location.href = "/onboarding")} // Assuming onboarding route exists or handle appropriately
        className="m-8"
      />
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorState message={error} onRetry={loadDashboardData} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your DRX CRM dashboard
        </p>
      </div>

      <SetupGuide />
      <WelcomeModal />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Sales (30d)
          </h3>
          <p className="text-3xl font-bold mt-2">
            ${stats.totalSales.toFixed(2)}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Active Customers
          </h3>
          <p className="text-3xl font-bold mt-2">{stats.activeCustomers}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Inventory Items
          </h3>
          <p className="text-3xl font-bold mt-2">{stats.inventoryItems}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Credit Outstanding
          </h3>
          <p className="text-3xl font-bold mt-2">
            ${stats.creditOutstanding.toFixed(2)}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold">Recent Sales Activity</h2>
        {stats.recentActivity.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="No Recent Activity"
            description="Sales and transactions will appear here once you start selling."
            className="mt-4 border-none bg-transparent"
          />
        ) : (
          <div className="mt-4 space-y-2">
            {stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex justify-between items-center p-3 border rounded"
              >
                <div>
                  <p className="font-medium">Sale #{activity.id.slice(-8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    ${(activity.total_amount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.order_status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
