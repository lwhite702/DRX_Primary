import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  canonical: vi.fn(),
  legacy: vi.fn(),
}));
vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.auth,
}));
vi.mock("@/app/api/pos/_lib/convex-commerce", () => ({
  getCanonicalCommerceSummary: mocks.canonical,
}));
vi.mock("@/lib/reports/commerce-delivery", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/reports/commerce-delivery")>()),
  getLegacyWebCommerceSummary: mocks.legacy,
}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "@/app/api/reports/commerce-delivery/route";
import {
  emptyCommerceDeliveryTotals,
  type CommerceDeliverySourceSummary,
} from "@/lib/reports/commerce-delivery";

function localSummary(): CommerceDeliverySourceSummary {
  return {
    source: "legacy_web",
    totals: {
      ...emptyCommerceDeliveryTotals(),
      orderCount: 1,
      merchandiseRevenueCents: 2000,
    },
    orderNumbers: ["POS-synthetic"],
    unallocatedCogsOrderCount: 0,
    untrackedVendorExpenseOrderCount: 0,
    cogsAllocationCoverage: null,
    manualCostCoverage: null,
    grossProfitComplete: true,
  };
}
const request = (format = "json") =>
  new NextRequest(
    `http://localhost/api/reports/commerce-delivery?from=2026-08-30&to=2026-08-31&format=${format}`,
  );

describe("commerce reporting source coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      userId: "synthetic-user",
      businessId: "synthetic-business",
    });
    mocks.canonical.mockResolvedValue({
      ...emptyCommerceDeliveryTotals(),
      orderCount: 1,
      merchandiseRevenueCents: 1000,
      totalTaxCents: 0,
      orderNumbers: ["WEB-canonical"],
      cogsAllocationCoverage: null,
      manualCostCoverage: null,
      grossProfitComplete: true,
    });
    mocks.legacy.mockResolvedValue({
      summary: localSummary(),
      duplicateOrdersExcluded: 0,
    });
  });
  it("includes active ordinary web sales alongside canonical sales and passes deduplication references", async () => {
    const response = await GET(request());
    const report = await response.json();
    expect(response.status).toBe(200);
    expect(report.combined).toMatchObject({
      orderCount: 2,
      merchandiseRevenueCents: 3000,
    });
    expect(mocks.legacy).toHaveBeenCalledWith(
      "synthetic-business",
      { from: new Date("2026-08-30"), to: new Date("2026-08-31") },
      ["WEB-canonical"],
    );
  });
  it("preserves provenance and missing-cost warnings during canonical fallback", async () => {
    mocks.canonical.mockRejectedValue(
      new Error("Synthetic canonical unavailable"),
    );
    const summary = localSummary();
    summary.unallocatedCogsOrderCount = 1;
    summary.untrackedVendorExpenseOrderCount = 1;
    summary.totals.unclassifiedTaxCents = 100;
    mocks.legacy.mockResolvedValue({ summary, duplicateOrdersExcluded: 0 });
    const response = await GET(request());
    const report = await response.json();
    expect(response.status).toBe(200);
    expect(report.canonical.available).toBe(false);
    expect(report.legacyWeb.source).toBe("legacy_web");
    expect(report.legacyWeb.totals.orderCount).toBe(1);
    expect(report.grossProfitComplete).toBe(false);
    expect(report.warnings.join(" ")).toMatch(/Canonical.*unavailable/);
    expect(report.warnings.join(" ")).toContain("no FIFO allocation");
    expect(report.warnings.join(" ")).toContain("vendor expense");
    expect(report.warnings.join(" ")).toContain("Legacy web tax");
  });
  it("returns visibly incomplete canonical results when the web ledger is unavailable", async () => {
    mocks.legacy.mockRejectedValue(new Error("Synthetic local unavailable"));
    const response = await GET(request());
    const report = await response.json();
    expect(response.status).toBe(200);
    expect(report.legacyWeb.available).toBe(false);
    expect(report.grossProfitComplete).toBe(false);
    expect(report.warnings.join(" ")).toMatch(/Legacy web.*unavailable/);
  });
  it("does not present a complete zero report when neither ledger can be read", async () => {
    mocks.canonical.mockRejectedValue(new Error("sensitive-canonical-detail"));
    mocks.legacy.mockRejectedValue(new Error("sensitive-database-detail"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("sensitive");
  });
  it("exports source unavailability and accounting warnings to CSV", async () => {
    mocks.canonical.mockRejectedValue(new Error("Synthetic unavailable"));
    const summary = localSummary();
    summary.unallocatedCogsOrderCount = 1;
    mocks.legacy.mockResolvedValue({ summary, duplicateOrdersExcluded: 0 });
    const response = await GET(request("csv"));
    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv).toContain("unavailable");
    expect(csv).toContain("no FIFO allocation");
    expect(csv).toContain("known_costs_only");
  });
  it("does not read either ledger for anonymous requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, businessId: null });
    expect((await GET(request())).status).toBe(401);
    expect(mocks.canonical).not.toHaveBeenCalled();
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("rejects invalid periods before reading sales", async () => {
    expect(
      (
        await GET(
          new NextRequest(
            "http://localhost/api/reports/commerce-delivery?from=bad",
          ),
        )
      ).status,
    ).toBe(400);
    expect(mocks.canonical).not.toHaveBeenCalled();
  });
});
