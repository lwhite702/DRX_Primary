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
  });

  it("includes FIFO-backed COGS and gross profit in baseline metrics", async () => {
    mocks.query
      .mockResolvedValueOnce({
        totalRevenueCents: 10000,
        orderCount: 1,
        costOfGoodsSoldCents: 4000,
        grossProfitCents: 6000,
      })
      .mockResolvedValueOnce({
        totalRevenueCents: 8000,
        orderCount: 2,
        costOfGoodsSoldCents: 3000,
        grossProfitCents: 5000,
      })
      .mockResolvedValueOnce({
        totalRevenueCents: 5000,
        orderCount: 1,
        costOfGoodsSoldCents: 2000,
        grossProfitCents: 3000,
      })
      .mockResolvedValueOnce([
        {
          _id: "sale_today",
          totalAmountCents: 10000,
          paymentMethod: "cash",
          customerId: "cust_1",
          createdAt: Date.now(),
        },
      ]);

    const report = await getPosBaselineReport("biz_1");

    expect(report.today.salesTotal).toBe(100);
    expect(report.today.salesCount).toBe(1);
    expect(report.today.costOfGoodsSold).toBe(40);
    expect(report.today.grossProfit).toBe(60);
    expect(report.week.salesTotal).toBe(80);
    expect(report.previousWeek.salesTotal).toBe(50);
    expect(report.recentSales[0].id).toBe("sale_today");
  });
});
