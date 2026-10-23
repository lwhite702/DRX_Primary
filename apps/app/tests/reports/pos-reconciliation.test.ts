import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  businessClient: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/business/convex-server", () => ({
  businessClient: mocks.businessClient,
}));

import { getPosReconciliationReport } from "@/lib/reports/pos-reconciliation";

describe("getPosReconciliationReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({
      client: { query: mocks.query },
      businessId: "business_123",
      expectedUserId: "user_123",
    });
  });

  it("reports zero discrepancies for aligned sales", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "sale_1",
        createdAt: new Date("2026-03-25T10:00:00.000Z").getTime(),
      },
    ]);

    const report = await getPosReconciliationReport("business_123", {
      from: new Date("2026-03-25T00:00:00.000Z"),
      to: new Date("2026-03-25T23:59:59.999Z"),
    });

    expect(report.summary.salesChecked).toBe(1);
    expect(report.summary.discrepancies).toBe(0);
    expect(report.discrepancies).toEqual([]);
  });

  it("filters sales by date range", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "sale_in",
        createdAt: new Date("2026-03-26T10:00:00.000Z").getTime(),
      },
      {
        _id: "sale_out",
        createdAt: new Date("2026-03-20T10:00:00.000Z").getTime(),
      },
    ]);

    const report = await getPosReconciliationReport("business_123", {
      from: new Date("2026-03-26T00:00:00.000Z"),
      to: new Date("2026-03-26T23:59:59.999Z"),
    });

    expect(report.summary.salesChecked).toBe(1);
    expect(report.summary.discrepancies).toBe(0);
  });

  it("treats an exclusive end boundary as belonging only to the next period", async () => {
    mocks.query.mockResolvedValue([
      { _id: "sale_inside", createdAt: new Date("2026-03-27T00:00:00.000Z").getTime() - 1 },
      { _id: "sale_at_end", createdAt: new Date("2026-03-27T00:00:00.000Z").getTime() },
    ]);

    const report = await getPosReconciliationReport("business_123", {
      from: new Date("2026-03-26T00:00:00.000Z"),
      to: new Date("2026-03-27T00:00:00.000Z"),
      toExclusive: true,
    });

    expect(report.summary.salesChecked).toBe(1);
  });
});
