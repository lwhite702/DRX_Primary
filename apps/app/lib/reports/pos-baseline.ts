import "server-only";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export interface PosBaselineReport {
  period: { from: string; to: string; mode: "default" | "custom" };
  today: { salesTotal: number; salesCount: number; cashCollected: number; costOfGoodsSold: number; grossProfit: number };
  week: { salesTotal: number; salesCount: number; costOfGoodsSold: number; grossProfit: number };
  previousWeek: { salesTotal: number; salesCount: number; costOfGoodsSold: number; grossProfit: number };
  topProducts: Array<{ id: string; name: string; sku: string | null; quantitySold: number; revenue: number }>;
  lowStock: { count: number; items: Array<{ id: string; name: string; sku: string; quantityOnHand: number; lowStockThreshold: number }> };
  credit: { outstandingBalance: number; activeBalances: number };
  recentSales: Array<{ id: string; total: number; costOfGoodsSold: number; grossProfit: number; costSource: "fifo" | "unallocated"; paymentMethod: string | null; customerId: string | null; createdAt: string }>;
  unallocatedSalesCount: number; latestAuditAt: string | null; generatedAt: string;
}

const day = 86_400_000;
function utcDayStart(value: Date) { return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()); }
function money(cents: number) { return Number((cents / 100).toFixed(2)); }

export async function getPosBaselineReport(businessId: string, range?: { from?: Date; to?: Date }): Promise<PosBaselineReport> {
  const now = new Date();
  const custom = Boolean(range?.from || range?.to);
  const start = custom ? utcDayStart(range?.from ?? now) : utcDayStart(now);
  const end = custom ? utcDayStart(range?.to ?? now) + day : start + day;
  const weekStart = custom ? start : start - ((new Date(start).getUTCDay() + 6) % 7) * day;
  const weekEnd = custom ? end : weekStart + 7 * day;
  const previousStart = weekStart - 7 * day;
  const client = (await businessClient(businessId)).client;
  const [today, week, previous, sales] = await Promise.all([
    client.query(api.reporting.getFinancialReport, { startDate: start, endDate: end - 1 }),
    client.query(api.reporting.getFinancialReport, { startDate: weekStart, endDate: weekEnd - 1 }),
    client.query(api.reporting.getFinancialReport, { startDate: previousStart, endDate: weekStart - 1 }),
    client.query(api.checkout.getSalesHistory, {}),
  ]);
  const summarize = (report: typeof today) => ({ salesTotal: money(report.totalRevenueCents), salesCount: report.orderCount, cashCollected: money(report.totalRevenueCents), costOfGoodsSold: money(report.costOfGoodsSoldCents), grossProfit: money(report.grossProfitCents) });
  const recentSales = sales.slice(0, 10).map(sale => ({ id: sale._id, total: money(sale.totalAmountCents), costOfGoodsSold: 0, grossProfit: money(sale.totalAmountCents), costSource: "unallocated" as const, paymentMethod: sale.paymentMethod ?? null, customerId: sale.customerId ?? null, createdAt: new Date(sale.createdAt).toISOString() }));
  return {
    period: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), mode: custom ? "custom" : "default" },
    today: summarize(today), week: summarize(week), previousWeek: summarize(previous),
    topProducts: [], lowStock: { count: 0, items: [] }, credit: { outstandingBalance: 0, activeBalances: 0 }, recentSales,
    unallocatedSalesCount: recentSales.length, latestAuditAt: null, generatedAt: new Date().toISOString(),
  };
}
