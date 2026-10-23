import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  businessClient: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/business/convex-server", () => ({
  businessClient: mocks.businessClient,
}));

import { getPosBaselineReport } from "@/lib/reports/pos-baseline";

describe("getPosBaselineReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({
      client: { query: mocks.query },
      businessId: "biz_1",
      expectedUserId: "user_1",
    });
    mocks.query.mockResolvedValueOnce({ timezone: "America/New_York" });
  });

  it("includes FIFO-backed COGS and gross profit in baseline metrics", async () => {
    mocks.query
      .mockResolvedValueOnce({
        paymentMethodTotalsCents: { cash: 6500, split: 3500 },
        topProducts: [{ id: "product_1", name: "Flower", sku: "FL-1", quantitySoldGrams: 2.5, revenueCents: 7000 }],
        totalRevenueCents: 10000,
        orderCount: 1,
        cashSalesCents: 6500,
        totalTaxCents: 800,
        totalSubtotalCents: 9200,
        averageOrderValueCents: 10000,
        cogsCents: 4000,
        grossProfitCents: 6000,
        grossProfitComplete: true,
      })
      .mockResolvedValueOnce({
        paymentMethodTotalsCents: { cash: 4000, card: 4000 },
        topProducts: [{ id: "product_1", name: "Flower", sku: "FL-1", quantitySoldGrams: 5, revenueCents: 7000 }],
        totalRevenueCents: 8000,
        orderCount: 2,
        cashSalesCents: 4000,
        totalTaxCents: 600,
        totalSubtotalCents: 7400,
        averageOrderValueCents: 4000,
        cogsCents: 3000,
        grossProfitCents: 5000,
        grossProfitComplete: true,
      })
      .mockResolvedValueOnce({
        paymentMethodTotalsCents: { card: 5000 },
        topProducts: [],
        totalRevenueCents: 5000,
        orderCount: 1,
        cashSalesCents: 2500,
        totalTaxCents: 400,
        totalSubtotalCents: 4600,
        averageOrderValueCents: 5000,
        cogsCents: 2000,
        grossProfitCents: 3000,
        grossProfitComplete: true,
      })
      .mockResolvedValueOnce([
        {
          _id: "sale_today",
          totalAmountCents: 10000,
          paymentMethod: "cash",
          customerId: "cust_1",
          createdAt: Date.now(),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ page: [], isDone: false, continueCursor: "more" });

    const report = await getPosBaselineReport("biz_1");

    expect(report.today.salesTotal).toBe(100);
    expect(report.today.salesCount).toBe(1);
    expect(report.today.cashSales).toBe(65);
    expect(report.today.totalTax).toBe(8);
    expect(report.today.averageOrderValue).toBe(100);
    expect(report.today.costOfGoodsSold).toBe(40);
    expect(report.today.grossProfit).toBe(60);
    expect(report.todayTopProducts[0]).toMatchObject({ id: "product_1", quantitySoldGrams: 2.5, revenue: 70 });
    expect(report.paymentMethodTotals).toEqual({ cash: 65, split: 35 });
    expect(report.topProducts[0]).toMatchObject({ id: "product_1", quantitySoldGrams: 5, revenue: 70 });
    expect(report.week.salesTotal).toBe(80);
    expect(report.previousWeek.salesTotal).toBe(50);
    expect(report.period.timezone).toBe("America/New_York");
    expect(report.lowStock.count).toBe(0);
    expect(report.credit).toEqual({ outstandingBalance: null, activeBalances: null });
    expect(report.recentSales[0].id).toBe("sale_today");
    const aggregateArguments = mocks.query.mock.calls.slice(1, 4).map(([, args]) => args);
    expect(aggregateArguments.map((args) => args.timezone)).toEqual([
      "America/New_York",
      "America/New_York",
      "America/New_York",
    ]);
    const previousPeriodArgs = aggregateArguments[2];
    expect(previousPeriodArgs.endAt).toBe(aggregateArguments[1].startAt);
    expect(previousPeriodArgs.endAt - previousPeriodArgs.startAt).toBe(7 * 24 * 60 * 60 * 1_000);
    expect(mocks.query.mock.calls[4][1]).toMatchObject({
      startAt: aggregateArguments[0].startAt,
      endAt: aggregateArguments[0].endAt,
    });
    expect(mocks.query.mock.calls[6][1].paginationOpts).toEqual({ cursor: null, numItems: 100 });
  });
});
