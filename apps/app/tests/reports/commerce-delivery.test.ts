import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSales: vi.fn(),
  groupAllocations: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    sales: { findMany: mocks.findSales },
    salesLineItemAllocation: { groupBy: mocks.groupAllocations },
  },
}));

import {
  combineCommerceDeliverySummaries,
  emptyCommerceDeliveryTotals,
  getLegacyWebCommerceSummary,
  type CommerceDeliverySourceSummary,
} from "@/lib/reports/commerce-delivery";

describe("combined commerce and delivery reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates mirrored order references and derives legacy components", async () => {
    mocks.findSales.mockResolvedValue([
      {
        id: "mirrored",
        orderNumber: "POS-11111111-1111-4111-8111-111111111111",
        subtotal: 20,
        taxAmount: 1,
        totalAmount: 21,
        deliveryPrice: 0,
        deliveryManagementId: null,
        deliveryAddress: null,
        fees: [],
      },
      {
        id: "legacy-only",
        orderNumber: "POS-22222222-2222-4222-8222-222222222222",
        subtotal: 100,
        taxAmount: 8,
        totalAmount: 103,
        deliveryPrice: 5,
        deliveryManagementId: "delivery-profile",
        deliveryAddress: "Synthetic address",
        fees: [],
      },
    ]);
    mocks.groupAllocations.mockResolvedValue([
      { saleId: "legacy-only", _sum: { extendedCost: 40 } },
    ]);

    const result = await getLegacyWebCommerceSummary(
      "business-a",
      {
        from: new Date("2026-08-21T00:00:00.000Z"),
        to: new Date("2026-08-21T23:59:59.999Z"),
      },
      ["WEB-11111111-1111-4111-8111-111111111111"],
    );

    expect(result.duplicateOrdersExcluded).toBe(1);
    expect(result.summary.orderNumbers).toEqual([
      "POS-22222222-2222-4222-8222-222222222222",
    ]);
    expect(result.summary.totals).toMatchObject({
      orderCount: 1,
      grossCollectedCents: 10_300,
      merchandiseRevenueCents: 9_000,
      deliveryRevenueCents: 500,
      unclassifiedTaxCents: 800,
      discountCents: 1_000,
      cogsCents: 4_000,
      netRevenueCents: 9_500,
      grossProfitCents: 5_500,
    });
    expect(result.summary.untrackedVendorExpenseOrderCount).toBe(1);
  });

  it("flags absorbed legacy delivery even when the customer delivery charge is zero", async () => {
    mocks.findSales.mockResolvedValue([
      {
        id: "absorbed-delivery",
        orderNumber: "POS-33333333-3333-4333-8333-333333333333",
        subtotal: 50,
        taxAmount: 0,
        totalAmount: 50,
        deliveryPrice: 0,
        deliveryManagementId: "legacy-provider",
        deliveryAddress: null,
        fees: [],
      },
    ]);
    mocks.groupAllocations.mockResolvedValue([
      { saleId: "absorbed-delivery", _sum: { extendedCost: 20 } },
    ]);

    const result = await getLegacyWebCommerceSummary("business-a", {
      from: new Date("2026-08-21T00:00:00.000Z"),
      to: new Date("2026-08-22T00:00:00.000Z"),
    });

    expect(result.summary.totals.deliveryRevenueCents).toBe(0);
    expect(result.summary.untrackedVendorExpenseOrderCount).toBe(1);
  });

  it("keeps source columns and marks incomplete historical profit explicitly", () => {
    const canonical: CommerceDeliverySourceSummary = {
      source: "canonical",
      totals: {
        ...emptyCommerceDeliveryTotals(),
        orderCount: 1,
        grossCollectedCents: 2_650,
        netCashActivityCents: 2_650,
        merchandiseRevenueCents: 1_900,
        deliveryRevenueCents: 500,
        vendorDeliveryExpenseCents: 500,
        deliveryTaxCents: 50,
        discountCents: 450,
        cogsCents: 900,
        netRevenueCents: 2_400,
        grossProfitCents: 1_000,
      },
      orderNumbers: ["WEB-canonical"],
      unallocatedCogsOrderCount: 0,
      untrackedVendorExpenseOrderCount: 0,
      cogsAllocationCoverage: {
        inventoryLineCount: 1,
        fullyAllocatedLineCount: 1,
        partiallyAllocatedLineCount: 0,
        unallocatedLineCount: 0,
        expectedQuantity: 2,
        allocatedQuantity: 2,
        unallocatedQuantity: 0,
        coverageBps: 10_000,
      },
      manualCostCoverage: {
        manualLineCount: 2,
        knownCostLineCount: 1,
        unknownCostLineCount: 1,
        knownManualCogsCents: 250,
        complete: false,
      },
      grossProfitComplete: false,
    };
    const legacyWeb: CommerceDeliverySourceSummary = {
      source: "legacy_web",
      totals: {
        ...emptyCommerceDeliveryTotals(),
        orderCount: 1,
        netCashActivityCents: 10_300,
        merchandiseRevenueCents: 9_000,
        deliveryRevenueCents: 500,
        unclassifiedTaxCents: 800,
        cogsCents: 4_000,
        netRevenueCents: 9_500,
        grossProfitCents: 5_500,
      },
      orderNumbers: ["POS-legacy"],
      unallocatedCogsOrderCount: 0,
      untrackedVendorExpenseOrderCount: 1,
      cogsAllocationCoverage: null,
      manualCostCoverage: null,
      grossProfitComplete: false,
    };

    const result = combineCommerceDeliverySummaries({
      period: {
        from: "2026-08-21T00:00:00.000Z",
        to: "2026-08-21T23:59:59.999Z",
      },
      canonical,
      legacyWeb,
    });

    expect(result.combined).toMatchObject({
      orderCount: 2,
      merchandiseRevenueCents: 10_900,
      deliveryRevenueCents: 1_000,
      vendorDeliveryExpenseCents: 500,
      grossProfitCents: 6_500,
    });
    expect(result.grossProfitComplete).toBe(false);
    expect(result.warnings.join(" ")).toContain("did not persist vendor expense");
    expect(result.warnings.join(" ")).toContain("stored as one amount");
    expect(result.warnings.join(" ")).toContain("manual line(s) have unknown cost");
  });

  it("marks canonical gross profit incomplete when inventory COGS coverage has gaps", () => {
    const totals = emptyCommerceDeliveryTotals();
    const canonical: CommerceDeliverySourceSummary = {
      source: "canonical",
      totals,
      orderNumbers: ["WEB-gap"],
      unallocatedCogsOrderCount: 0,
      untrackedVendorExpenseOrderCount: 0,
      cogsAllocationCoverage: {
        inventoryLineCount: 2,
        fullyAllocatedLineCount: 1,
        partiallyAllocatedLineCount: 1,
        unallocatedLineCount: 0,
        expectedQuantity: 3,
        allocatedQuantity: 2.5,
        unallocatedQuantity: 0.5,
        coverageBps: 8_333,
      },
      manualCostCoverage: {
        manualLineCount: 0,
        knownCostLineCount: 0,
        unknownCostLineCount: 0,
        knownManualCogsCents: 0,
        complete: true,
      },
      grossProfitComplete: true,
    };
    const legacyWeb: CommerceDeliverySourceSummary = {
      source: "legacy_web",
      totals: emptyCommerceDeliveryTotals(),
      orderNumbers: [],
      unallocatedCogsOrderCount: 0,
      untrackedVendorExpenseOrderCount: 0,
      cogsAllocationCoverage: null,
      manualCostCoverage: null,
      grossProfitComplete: true,
    };

    const result = combineCommerceDeliverySummaries({
      period: { from: "2026-08-21", to: "2026-08-22" },
      canonical,
      legacyWeb,
    });

    expect(result.grossProfitComplete).toBe(false);
    expect(result.warnings.join(" ")).toContain("83.33% complete");
  });
});
