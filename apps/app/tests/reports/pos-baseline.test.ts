import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  Prisma: {
    sql: (...args: unknown[]) => args,
    join: (values: unknown[]) => values,
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    sales: {
      findMany: vi.fn(),
    },
    creditLimit: {
      findMany: vi.fn(),
    },
    systemAuditLog: {
      findFirst: vi.fn(),
    },
    salesLineItem: {
      groupBy: vi.fn(),
    },
    salesLineItemAllocation: {
      groupBy: vi.fn(),
    },
    inventory: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { getPosBaselineReport } from "@/lib/reports/pos-baseline";

const mockedDb = db as unknown as {
  sales: { findMany: ReturnType<typeof vi.fn> };
  creditLimit: { findMany: ReturnType<typeof vi.fn> };
  systemAuditLog: { findFirst: ReturnType<typeof vi.fn> };
  salesLineItem: { groupBy: ReturnType<typeof vi.fn> };
  salesLineItemAllocation: { groupBy: ReturnType<typeof vi.fn> };
  inventory: { findMany: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe("getPosBaselineReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedDb.sales.findMany
      .mockResolvedValueOnce([
        { id: "sale_today", totalAmount: 100, paymentMethod: "cash" },
      ] as never)
      .mockResolvedValueOnce([
        { id: "sale_today", totalAmount: 100 },
        { id: "sale_week", totalAmount: 80 },
      ] as never)
      .mockResolvedValueOnce([
        { id: "sale_prev", totalAmount: 50 },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "sale_today",
          totalAmount: 100,
          paymentMethod: "cash",
          customerId: "cust_1",
          createdAt: new Date("2026-03-16T12:00:00.000Z"),
        },
      ] as never);

    mockedDb.creditLimit.findMany.mockResolvedValue([
      { currentBalance: 25 },
    ] as never);
    mockedDb.systemAuditLog.findFirst.mockResolvedValue({
      createdAt: new Date("2026-03-16T12:30:00.000Z"),
    } as never);
    mockedDb.salesLineItem.groupBy.mockResolvedValue([
      {
        inventoryId: "inv_1",
        _sum: { quantity: 3, lineTotal: 180 },
      },
    ] as never);
    mockedDb.inventory.findMany.mockResolvedValue([
      { id: "inv_1", productName: "Flower", sku: "FLOW-1" },
    ] as never);
    mockedDb.$queryRaw
      .mockResolvedValueOnce([
        {
          id: "inv_2",
          product_name: "Low Item",
          sku: "LOW-1",
          quantity_on_hand: 2,
          reorder_level: 5,
        },
      ] as never)
      .mockResolvedValueOnce([{ count: 1 }] as never)
      .mockResolvedValueOnce([
        { sale_id: "sale_today", extended_cost_sum: 40 },
        { sale_id: "sale_week", extended_cost_sum: 30 },
        { sale_id: "sale_prev", extended_cost_sum: 10 },
      ] as never);
  });

  it("includes FIFO-backed COGS and gross profit in baseline metrics", async () => {
    const report = await getPosBaselineReport("business_123");

    expect(report.today).toEqual({
      salesTotal: 100,
      salesCount: 1,
      cashCollected: 100,
      costOfGoodsSold: 40,
      grossProfit: 60,
    });
    expect(report.week).toEqual({
      salesTotal: 180,
      salesCount: 2,
      costOfGoodsSold: 70,
      grossProfit: 110,
    });
    expect(report.previousWeek).toEqual({
      salesTotal: 50,
      salesCount: 1,
      costOfGoodsSold: 10,
      grossProfit: 40,
    });
    expect(report.recentSales).toEqual([
      expect.objectContaining({
        id: "sale_today",
        total: 100,
        costOfGoodsSold: 40,
        grossProfit: 60,
      }),
    ]);
  });
});
