import "server-only";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { businessDateKey, businessDayBounds, shiftDateKey } from "@/convex/helpers/businessTimezone";

export interface PosBaselineReport {
  period: { from: string; to: string; dateKey: string; todayDateKey: string; mode: "default" | "custom"; timezone: string };
  today: { salesTotal: number; salesCount: number; cashSales: number; totalTax: number; subtotal: number; averageOrderValue: number; costOfGoodsSold: number | null; grossProfit: number | null };
  todayTopProducts: Array<{ id: string; name: string; sku: string; quantitySoldGrams: number; revenue: number }>;
  paymentMethodTotals: Record<string, number>;
  week: { salesTotal: number; salesCount: number; costOfGoodsSold: number | null; grossProfit: number | null };
  previousWeek: { salesTotal: number; salesCount: number; costOfGoodsSold: number | null; grossProfit: number | null };
  topProducts: Array<{ id: string; name: string; sku: string; quantitySoldGrams: number; revenue: number }>;
  lowStock: { count: number | null; items: Array<{ id: string; name: string; sku: string; quantityOnHand: number; lowStockThreshold: number }> };
  credit: { outstandingBalance: number | null; activeBalances: number | null };
  recentSales: Array<{ id: string; total: number; costOfGoodsSold: null; grossProfit: null; costSource: "unallocated"; paymentMethod: string | null; customerId: string | null; createdAt: string }>;
  unallocatedSalesCount: null; latestAuditAt: string | null; generatedAt: string;
}

export function getZonedDayBounds(date: Date | string, timeZone: string = "America/New_York") {
  const dateKey = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : businessDateKey(typeof date === "string" ? new Date(date) : date, timeZone);
  return { ...businessDayBounds(dateKey, timeZone), dateStr: dateKey };
}

function money(cents: number) { return Number((cents / 100).toFixed(2)); }

async function summarizeCredit(client: Awaited<ReturnType<typeof businessClient>>["client"], businessId: string, expectedUserId: string) {
  let cursor: string | null = null;
  let isDone = false;
  let balanceCents = 0;
  let activeBalances = 0;
  let consistent = true;

  while (!isDone) {
    const result: {
      page: Array<{ allocationStatus: string; isActive: boolean; balanceCents: number }>;
      isDone: boolean;
      continueCursor: string;
    } = await client.query(api.creditDashboard.accountsPage, {
      businessId,
      expectedUserId,
      paginationOpts: { cursor, numItems: 100 },
    });
    for (const account of result.page) {
      if (account.allocationStatus === "pending" || account.allocationStatus === "unreconciled") {
        consistent = false;
        continue;
      }
      if (!account.isActive || account.balanceCents <= 0) continue;
      balanceCents += account.balanceCents;
      activeBalances += 1;
    }
    isDone = result.isDone;
    cursor = result.continueCursor;
  }

  return consistent
    ? { outstandingBalance: money(balanceCents), activeBalances }
    : { outstandingBalance: null, activeBalances: null };
}

export async function getPosBaselineReport(businessId: string, range?: { from?: Date | string; to?: Date | string }): Promise<PosBaselineReport> {
  const clientContext = await businessClient(businessId);
  const client = clientContext.client;
  const profile = await client.query(api.businessProfiles.getProfile, {
    businessId: clientContext.businessId,
    expectedUserId: clientContext.expectedUserId,
  });
  const timeZone = profile.timezone || "America/New_York";

  const now = new Date();
  const custom = Boolean(range?.from || range?.to);
  const todayDateKey = businessDateKey(now, timeZone);
  const fromBounds = range?.from ? getZonedDayBounds(range.from, timeZone) : getZonedDayBounds(todayDateKey, timeZone);
  const toBounds = range?.to ? getZonedDayBounds(range.to, timeZone) : fromBounds;

  const start = fromBounds.startAt;
  const end = toBounds.endAt;
  const weekStart = custom
    ? start
    : businessDayBounds(shiftDateKey(todayDateKey, -6), timeZone).startAt;
  const selectedWindowDays = Math.round(
    (Date.parse(`${toBounds.dateStr}T00:00:00Z`) - Date.parse(`${fromBounds.dateStr}T00:00:00Z`)) / 86_400_000,
  ) + 1;
  const previousStart = businessDayBounds(
    shiftDateKey(custom ? fromBounds.dateStr : todayDateKey, custom ? -selectedWindowDays : -7),
    timeZone,
  ).startAt;
  const previousEnd = custom ? start : weekStart;

  const [today, week, previous, sales] = await Promise.all([
    client.query(api.reporting.getSalesAggregate, { startAt: start, endAt: end, timezone: timeZone }),
    client.query(api.reporting.getSalesAggregate, { startAt: weekStart, endAt: end, timezone: timeZone }),
    client.query(api.reporting.getSalesAggregate, { startAt: previousStart, endAt: previousEnd, timezone: timeZone }),
    client.query(api.checkout.getSalesHistory, {}),
  ]);
  const [products, credit] = await Promise.all([
    client.query(api.products.listProducts, {}),
    summarizeCredit(client, clientContext.businessId, clientContext.expectedUserId),
  ]);
  const eligibleProducts = products.filter((product) => product.isActive && product.reorderLevelGrams > 0);
  const lowStockProducts = eligibleProducts.filter((product) => product.quantityOnHandGrams <= product.reorderLevelGrams);
  const lowStock = products.length < 500
    ? {
        count: lowStockProducts.length,
        items: lowStockProducts.map((product) => ({
          id: product._id,
          name: product.productName,
          sku: product.sku,
          quantityOnHand: product.quantityOnHandGrams,
          lowStockThreshold: product.reorderLevelGrams,
        })),
      }
    : { count: null, items: [] };
  const summarize = (report: typeof today) => ({
    salesTotal: money(report.totalRevenueCents),
    salesCount: report.orderCount,
    cashSales: money(report.cashSalesCents),
    totalTax: money(report.totalTaxCents),
    subtotal: money(report.totalSubtotalCents),
    averageOrderValue: money(report.averageOrderValueCents),
    costOfGoodsSold: report.grossProfitComplete ? money(report.cogsCents) : null,
    grossProfit: report.grossProfitComplete ? money(report.grossProfitCents) : null,
  });
  const summarizePeriod = (report: typeof week) => ({
    salesTotal: money(report.totalRevenueCents),
    salesCount: report.orderCount,
    costOfGoodsSold: report.grossProfitComplete ? money(report.cogsCents) : null,
    grossProfit: report.grossProfitComplete ? money(report.grossProfitCents) : null,
  });
  const topProducts = week.topProducts.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    quantitySoldGrams: product.quantitySoldGrams,
    revenue: money(product.revenueCents),
  }));
  const todayTopProducts = today.topProducts.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    quantitySoldGrams: product.quantitySoldGrams,
    revenue: money(product.revenueCents),
  }));
  const paymentMethodTotals = Object.fromEntries(
    Object.entries(today.paymentMethodTotalsCents).map(([method, cents]) => [method, money(cents)]),
  );
  const recentSales = Array.isArray(sales)
    ? sales
        .filter((sale) => sale.createdAt >= start && sale.createdAt < end)
        .slice(0, 10)
        .map((sale) => ({
          id: sale._id,
          total: money(sale.totalAmountCents),
          costOfGoodsSold: null,
          grossProfit: null,
          costSource: "unallocated" as const,
          paymentMethod: sale.paymentMethod ?? null,
          customerId: sale.customerId ?? null,
          createdAt: new Date(sale.createdAt).toISOString(),
        }))
    : [];
  return {
    period: { from: new Date(start).toISOString(), to: new Date(end).toISOString(), dateKey: fromBounds.dateStr, todayDateKey, mode: custom ? "custom" : "default", timezone: timeZone },
    today: summarize(today), todayTopProducts, paymentMethodTotals, week: summarizePeriod(week), previousWeek: summarizePeriod(previous),
    topProducts, lowStock, credit, recentSales,
    unallocatedSalesCount: null, latestAuditAt: null, generatedAt: new Date().toISOString(),
  };
}
