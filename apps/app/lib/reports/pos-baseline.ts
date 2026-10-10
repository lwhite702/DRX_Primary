import "server-only";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export interface PosBaselineReport {
  period: { from: string; to: string; mode: "default" | "custom"; timezone?: string };
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

export function getZonedDayBounds(date: Date, timeZone: string = "America/New_York") {
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateStr = dtf.format(date);
    const [y, m, d] = dateStr.split("-").map(Number);

    const getOffset = (targetDate: Date) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(targetDate);
      const map: Record<string, string> = {};
      for (const p of parts) map[p.type] = p.value;
      const asUTC = Date.UTC(
        parseInt(map.year, 10),
        parseInt(map.month, 10) - 1,
        parseInt(map.day, 10),
        parseInt(map.hour, 10),
        parseInt(map.minute, 10),
        parseInt(map.second, 10),
      );
      return asUTC - targetDate.getTime();
    };

    const zonedMidnight = (year: number, month: number, dayNum: number) => {
      const utcGuess = Date.UTC(year, month - 1, dayNum, 0, 0, 0);
      const offset1 = getOffset(new Date(utcGuess));
      const target1 = utcGuess - offset1;
      const offset2 = getOffset(new Date(target1));
      return utcGuess - offset2;
    };

    const startAt = zonedMidnight(y, m, d);
    const nextZoned = new Date(startAt + 86_400_000 + 3_600_000);
    const [ny, nm, nd] = dtf.format(nextZoned).split("-").map(Number);
    const endAt = zonedMidnight(ny, nm, nd);
    return { startAt, endAt, dateStr };
  } catch {
    const utcStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return { startAt: utcStart, endAt: utcStart + day, dateStr: date.toISOString().split("T")[0] };
  }
}

function money(cents: number) { return Number((cents / 100).toFixed(2)); }

export async function getPosBaselineReport(businessId: string, range?: { from?: Date; to?: Date; timezone?: string }): Promise<PosBaselineReport> {
  const clientContext = await businessClient(businessId);
  const client = clientContext.client;
  const timeZone = range?.timezone || "America/New_York";

  const now = new Date();
  const custom = Boolean(range?.from || range?.to);
  const fromBounds = range?.from ? getZonedDayBounds(range.from, timeZone) : getZonedDayBounds(now, timeZone);
  const toBounds = range?.to ? getZonedDayBounds(range.to, timeZone) : fromBounds;

  const start = fromBounds.startAt;
  const end = toBounds.endAt;
  const weekStart = custom ? start : start - 6 * day;
  const weekEnd = custom ? end : end;
  const previousStart = weekStart - 7 * day;

  const [today, week, previous, sales] = await Promise.all([
    client.query(api.reporting.getFinancialReport, { startDate: start, endDate: end - 1 }),
    client.query(api.reporting.getFinancialReport, { startDate: weekStart, endDate: weekEnd - 1 }),
    client.query(api.reporting.getFinancialReport, { startDate: previousStart, endDate: weekStart - 1 }),
    client.query(api.checkout.getSalesHistory, {}),
  ]);
  const summarize = (report: typeof today) => ({ salesTotal: money(report?.totalRevenueCents ?? 0), salesCount: report?.orderCount ?? 0, cashCollected: money(report?.totalRevenueCents ?? 0), costOfGoodsSold: money(report?.costOfGoodsSoldCents ?? 0), grossProfit: money(report?.grossProfitCents ?? 0) });
  const recentSales = Array.isArray(sales) ? sales.slice(0, 10).map(sale => ({ id: sale._id, total: money(sale.totalAmountCents), costOfGoodsSold: 0, grossProfit: money(sale.totalAmountCents), costSource: "unallocated" as const, paymentMethod: sale.paymentMethod ?? null, customerId: sale.customerId ?? null, createdAt: new Date(sale.createdAt).toISOString() })) : [];
  return {
    period: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), mode: custom ? "custom" : "default", timezone: timeZone },
    today: summarize(today), week: summarize(week), previousWeek: summarize(previous),
    topProducts: [], lowStock: { count: 0, items: [] }, credit: { outstandingBalance: 0, activeBalances: 0 }, recentSales,
    unallocatedSalesCount: recentSales.length, latestAuditAt: null, generatedAt: new Date().toISOString(),
  };
}
