import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface DashboardStats {
  salesToday: number;
  cashCollected: number;
  transactionsCount: number;
  salesGrowth: number; // Percentage
  lowStockCount: number;
  overdueBalance: number;
  overdueCount: number;
  recentActivity: ActivityItem[];
  topMovers: TopMover[];
  systemHealth: {
    syncStatus: "CLEAN" | "SYNCING" | "ERROR";
    brokenLinks: number;
    lastAudit: string;
    location: string;
  };
}

export interface ActivityItem {
  id: string;
  type: "sale" | "intake" | "payment" | "customer" | "credit";
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
}

export interface TopMover {
  id: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

export function useDashboardData(businessId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  const fetchDashboardData = useCallback(async () => {
    if (!businessId || !supabase) return;

    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Parallel data fetching
      const [todaysSales, lowStock, creditLimits, recentSales, topProducts] =
        await Promise.all([
          // 1. Sales Today
          supabase
            .from("sales")
            .select("total_amount, payment_method, created_at")
            .eq("business_id", businessId)
            .eq("order_status", "completed")
            .gte("created_at", todayIso),

          // 2. Low Stock Items
          supabase
            .from("inventory")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .lt("quantity_on_hand", 10), // Assuming 10 is the global low stock threshold for now

          // 3. Credit / Overdue
          supabase
            .from("credit_limits")
            .select("current_balance")
            .eq("business_id", businessId)
            .gt("current_balance", 0),

          // 4. Recent Activity (Sales for now, can expand to others)
          supabase
            .from("sales")
            .select("*")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(5),

          // 5. Top Movers (Mocked for now as it requires complex aggregation)
          // In a real app, this would be an RPC call or a dedicated diverse query
          Promise.resolve([]),
        ]);

      // --- Processing Data ---

      // Sales Stats
      const salesTodayTotal =
        todaysSales.data?.reduce(
          (sum: number, sale: any) => sum + (sale.total_amount || 0),
          0,
        ) || 0;
      const cashCollected =
        todaysSales.data
          ?.filter((s: any) => s.payment_method === "cash")
          .reduce(
            (sum: number, sale: any) => sum + (sale.total_amount || 0),
            0,
          ) || 0;

      // Overdue (Mock logic: assuming all positive balances are "overdue" for dashboard visual)
      // Real logic would check due dates in transactions
      const totalOverdue =
        creditLimits.data?.reduce(
          (sum: number, credit: any) => sum + (credit.current_balance || 0),
          0,
        ) || 0;
      const overdueCount = creditLimits.data?.length || 0;

      // Activity Feed Transformation
      const activities: ActivityItem[] =
        recentSales.data?.map((sale: any) => ({
          id: sale.id,
          type: "sale",
          title: "Sale Completed",
          description: `$${sale.total_amount} • Customer: ${sale.customer_id ? "Registered" : "Guest"}`,
          timestamp: sale.created_at,
          amount: sale.total_amount,
        })) || [];

      // Mocks for missing data points
      const mockTopMovers: TopMover[] = [
        {
          id: "1",
          name: "Blue Dream",
          category: "Flower • 1oz",
          quantitySold: 18,
          revenue: 2240,
        },
        {
          id: "2",
          name: "Gelato",
          category: "Flower • 3.5g",
          quantitySold: 14,
          revenue: 680,
        },
        {
          id: "3",
          name: "Wedding Cake",
          category: "Concentrate • 1g",
          quantitySold: 12,
          revenue: 560,
        },
        {
          id: "4",
          name: "Sour Diesel",
          category: "Flower • 7g",
          quantitySold: 9,
          revenue: 630,
        },
      ];

      setStats({
        salesToday: salesTodayTotal,
        cashCollected,
        transactionsCount: todaysSales.data?.length || 0,
        salesGrowth: 12.5, // Mock
        lowStockCount: lowStock.count || 0,
        overdueBalance: totalOverdue,
        overdueCount,
        recentActivity: activities,
        topMovers: mockTopMovers,
        systemHealth: {
          syncStatus: "CLEAN",
          brokenLinks: 0,
          lastAudit: "12 MIN AGO",
          location: "ACTIVE",
        },
      });
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [businessId, supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { stats, loading, error, refresh: fetchDashboardData };
}
