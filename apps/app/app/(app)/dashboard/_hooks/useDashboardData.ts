import { useState, useEffect, useCallback } from "react";

export interface DashboardStats {
  salesToday: number;
  cashCollected: number;
  transactionsCount: number;
  salesGrowth: number;
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

interface BaselineResponse {
  today: {
    salesTotal: number;
    salesCount: number;
    cashCollected: number;
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
    quantitySold: number;
    revenue: number;
  }>;
  lowStock: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      sku: string;
      quantityOnHand: number;
      lowStockThreshold: number;
    }>;
  };
  credit: {
    outstandingBalance: number;
    activeBalances: number;
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

function formatAuditLabel(latestAuditAt: string | null) {
  if (!latestAuditAt) return "NO AUDIT YET";
  const diffMs = Date.now() - new Date(latestAuditAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} HRS AGO`;
  const days = Math.floor(hours / 24);
  return `${days} DAYS AGO`;
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
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/reports/pos-baseline", { credentials: "same-origin" });
      if (!res.ok) {
        throw new Error("Failed to load dashboard report");
      }

      const report = (await res.json()) as BaselineResponse;

      const recentActivity: ActivityItem[] = report.recentSales.map((sale) => ({
        id: sale.id,
        type: "sale",
        title: "Sale Completed",
        description: `${sale.paymentMethod?.toUpperCase() || "UNKNOWN"} • ${sale.customerId ? "Registered" : "Walk-in"}`,
        timestamp: sale.createdAt,
        amount: sale.total,
      }));

      const topMovers: TopMover[] = report.topProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.sku ? `SKU ${product.sku}` : "POS Product",
        quantitySold: product.quantitySold,
        revenue: product.revenue,
      }));

      setStats({
        salesToday: report.today.salesTotal,
        cashCollected: report.today.cashCollected,
        transactionsCount: report.today.salesCount,
        salesGrowth: calcGrowth(report.week.salesTotal, report.previousWeek.salesTotal),
        lowStockCount: report.lowStock.count,
        overdueBalance: report.credit.outstandingBalance,
        overdueCount: report.credit.activeBalances,
        recentActivity,
        topMovers,
        systemHealth: {
          syncStatus: "CLEAN",
          brokenLinks: 0,
          lastAudit: formatAuditLabel(report.latestAuditAt),
          location: businessId ? "BUSINESS-SCOPED" : "UNKNOWN",
        },
      });
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { stats, loading, error, refresh: fetchDashboardData };
}

