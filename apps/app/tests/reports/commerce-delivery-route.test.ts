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
import { emptyCommerceDeliveryTotals } from "@/lib/reports/commerce-delivery";

const request = (format = "json") =>
  new NextRequest(
    `http://localhost/api/reports/commerce-delivery?from=2026-08-30&to=2026-08-31&format=${format}`,
  );

describe("commerce reporting source coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("includes active canonical sales in report summary", async () => {
    const response = await GET(request());
    const report = await response.json();
    expect(response.status).toBe(200);
    expect(report.combined).toMatchObject({
      orderCount: 1,
      merchandiseRevenueCents: 1000,
    });
  });

  it("returns 503 when canonical ledger is unavailable", async () => {
    mocks.canonical.mockRejectedValue(
      new Error("Synthetic canonical unavailable"),
    );
    const response = await GET(request());
    expect(response.status).toBe(503);
    const report = await response.json();
    expect(report.error).toContain("Commerce reporting is temporarily unavailable");
  });

  it("returns canonical results when legacy web is empty", async () => {
    const response = await GET(request());
    const report = await response.json();
    expect(response.status).toBe(200);
    expect(report.canonical.available).not.toBe(false);
    expect(report.legacyWeb.available).toBe(false);
  });

  it("does not present a complete zero report when neither ledger can be read", async () => {
    mocks.canonical.mockRejectedValue(new Error("sensitive-canonical-detail"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("sensitive");
  });

  it("exports canonical summary to CSV", async () => {
    const response = await GET(request("csv"));
    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv).toContain("Period start");
  });

  it("does not read either ledger for anonymous requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, businessId: null });
    expect((await GET(request())).status).toBe(401);
    expect(mocks.canonical).not.toHaveBeenCalled();
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
