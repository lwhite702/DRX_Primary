import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    sales: {
      findMany: vi.fn(),
    },
    inventoryLog: {
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { getPosReconciliationReport } from "@/lib/reports/pos-reconciliation";

const mockedDb = db as unknown as {
  sales: { findMany: ReturnType<typeof vi.fn> };
  inventoryLog: { findFirst: ReturnType<typeof vi.fn> };
};

describe("getPosReconciliationReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports zero discrepancies for aligned sales", async () => {
    mockedDb.sales.findMany.mockResolvedValue([
      {
        id: "sale_1",
        subtotal: 30,
        totalAmount: 30,
        createdAt: new Date("2026-03-25T10:00:00.000Z"),
        items: [
          {
            id: "line_1",
            inventoryId: "inv_1",
            quantity: 2,
            lineTotal: 30,
            weightSoldGrams: 0,
            allocations: [{ quantityGrams: 2 }],
          },
        ],
      },
    ]);
    mockedDb.inventoryLog.findFirst.mockResolvedValue({ quantityChange: -2 });

    const report = await getPosReconciliationReport("business_123", {
      from: new Date("2026-03-25"),
      to: new Date("2026-03-25"),
    });

    expect(report.summary.salesChecked).toBe(1);
    expect(report.summary.discrepancies).toBe(0);
    expect(report.discrepancies).toEqual([]);
  });

  it("flags mismatches and missing logs", async () => {
    mockedDb.sales.findMany.mockResolvedValue([
      {
        id: "sale_2",
        subtotal: 30,
        totalAmount: 30,
        createdAt: new Date("2026-03-26T10:00:00.000Z"),
        items: [
          {
            id: "line_2",
            inventoryId: "inv_2",
            quantity: 2,
            lineTotal: 25,
            weightSoldGrams: 0,
            allocations: [{ quantityGrams: 1 }],
          },
        ],
      },
    ]);
    mockedDb.inventoryLog.findFirst.mockResolvedValue(null);

    const report = await getPosReconciliationReport("business_123", {
      from: new Date("2026-03-26"),
      to: new Date("2026-03-26"),
    });

    expect(report.summary.discrepancies).toBe(3);
    expect(report.summary.discrepancyByCode.SALE_TOTAL_MISMATCH).toBe(1);
    expect(report.summary.discrepancyByCode.LINE_ALLOCATION_GAP).toBe(1);
    expect(report.summary.discrepancyByCode.INVENTORY_LOG_MISSING).toBe(1);
  });
});
