import { useState, useEffect, useCallback, useRef } from "react";

export interface DashboardStats {
  salesToday: number;
  cashSales: number;
  totalTax: number;
  subtotal: number;
  averageOrderValue: number;
  transactionsCount: number;
  salesGrowth: number;
  lowStockCount: number | null;
  outstandingBalance: number | null;
  outstandingAccounts: number | null;
  recentActivity: ActivityItem[];
  topMovers: TopMover[];
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
  quantitySoldGrams: number;
  revenue: number;
}

interface BaselineResponse {
  today: {
    salesTotal: number;
    salesCount: number;
    cashSales: number;
    totalTax: number;
    subtotal: number;
    averageOrderValue: number;
  };
  week: {
    salesTotal: number;
    salesCount: number;
  };
  previousWeek: {
    salesTotal: number;
    salesCount: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    sku: string | null;
    quantitySoldGrams: number;
    revenue: number;
  }>;
  todayTopProducts: Array<{
    id: string;
    name: string;
    sku: string;
    quantitySoldGrams: number;
    revenue: number;
  }>;
  lowStock: {
    count: number | null;
    items: Array<{
      id: string;
      name: string;
      sku: string;
      quantityOnHand: number;
      lowStockThreshold: number;
    }>;
  };
  credit: {
    outstandingBalance: number | null;
    activeBalances: number | null;
  };
  recentSales: Array<{
    id: string;
    total: number;
    paymentMethod: string | null;
    customerId: string | null;
    createdAt: string;
  }>;
  latestAuditAt: string | null;
}

function calcGrowth(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function useDashboardData(businessId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statsRef = useRef<DashboardStats | null>(null);
  const statsBusinessIdRef = useRef<string | undefined>(undefined);
  const requestControllerRef = useRef<AbortController | null>(null);

  const fetchDashboardData = useCallback(async () => {
    requestControllerRef.current?.abort();

    if (!businessId) {
      statsRef.current = null;
      statsBusinessIdRef.current = undefined;
      setStats(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const hasCurrentStats =
      statsRef.current !== null && statsBusinessIdRef.current === businessId;

    if (!hasCurrentStats) {
      statsRef.current = null;
      statsBusinessIdRef.current = businessId;
      setStats(null);
    }

    try {
      setLoading(!hasCurrentStats);
      setRefreshing(hasCurrentStats);
      setError(null);

      const res = await fetch("/api/reports/pos-baseline", {
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error("Couldn’t load today’s report.");
      }

      const report = (await res.json()) as BaselineResponse;
      if (controller.signal.aborted) return;

      const recentActivity: ActivityItem[] = report.recentSales.map((sale) => ({
        id: sale.id,
        type: "sale",
        title: "Sale Completed",
        description: `${sale.paymentMethod?.toUpperCase() || "UNKNOWN"} • ${sale.customerId ? "Registered" : "Walk-in"}`,
        timestamp: sale.createdAt,
        amount: sale.total,
      }));

      const topMovers: TopMover[] = report.todayTopProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.sku ? `SKU ${product.sku}` : "POS Product",
        quantitySoldGrams: product.quantitySoldGrams,
        revenue: product.revenue,
      }));

      const nextStats: DashboardStats = {
        salesToday: report.today.salesTotal,
        cashSales: report.today.cashSales,
        totalTax: report.today.totalTax,
        subtotal: report.today.subtotal,
        averageOrderValue: report.today.averageOrderValue,
        transactionsCount: report.today.salesCount,
        salesGrowth: calcGrowth(
          report.week.salesTotal,
          report.previousWeek.salesTotal,
        ),
        lowStockCount: report.lowStock.count,
        outstandingBalance: report.credit.outstandingBalance,
        outstandingAccounts: report.credit.activeBalances,
        recentActivity,
        topMovers,
      };

      statsRef.current = nextStats;
      statsBusinessIdRef.current = businessId;
      setStats(nextStats);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Dashboard Fetch Error:", err);
      setError("Couldn’t load today’s numbers. Try again.");
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [businessId]);

  useEffect(() => {
    void fetchDashboardData();

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [fetchDashboardData]);

  const statsMatchBusiness = statsBusinessIdRef.current === businessId;

  return {
    stats: statsMatchBusiness ? stats : null,
    loading: loading || Boolean(businessId && !statsMatchBusiness),
    refreshing: statsMatchBusiness ? refreshing : false,
    error: statsMatchBusiness ? error : null,
    refresh: fetchDashboardData,
  };
}
