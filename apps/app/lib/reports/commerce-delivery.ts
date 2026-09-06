import "server-only";

import { db } from "@/lib/db";

export interface CommerceDeliveryTotals {
  orderCount: number;
  grossCollectedCents: number;
  netCashActivityCents: number;
  merchandiseRevenueCents: number;
  feeRevenueCents?: number;
  deliveryRevenueCents: number;
  vendorDeliveryExpenseCents: number;
  deliveryTaxCents: number;
  unclassifiedTaxCents: number;
  discountCents: number;
  cogsCents: number;
  customerFeeRefundCents: number;
  deliveryTaxRefundCents: number;
  vendorCreditsCents: number;
  netRevenueCents: number;
  grossProfitCents: number;
}

export interface CommerceDeliverySourceSummary {
  source: "canonical" | "legacy_web";
  /** False means this source could not be read, not that it had zero sales. */
  available?: boolean;
  totals: CommerceDeliveryTotals;
  orderNumbers: string[];
  unallocatedCogsOrderCount: number;
  untrackedVendorExpenseOrderCount: number;
  cogsAllocationCoverage: CogsAllocationCoverage | null;
  manualCostCoverage: ManualCostCoverage | null;
  grossProfitComplete: boolean;
}

export interface CogsAllocationCoverage {
  inventoryLineCount: number;
  fullyAllocatedLineCount: number;
  partiallyAllocatedLineCount: number;
  unallocatedLineCount: number;
  expectedQuantity: number;
  allocatedQuantity: number;
  unallocatedQuantity: number;
  coverageBps: number;
}

export interface ManualCostCoverage {
  manualLineCount: number;
  knownCostLineCount: number;
  unknownCostLineCount: number;
  knownManualCogsCents: number;
  complete: boolean;
}

export interface CombinedCommerceDeliverySummary {
  period: { from: string; to: string };
  canonical: CommerceDeliverySourceSummary;
  legacyWeb: CommerceDeliverySourceSummary;
  combined: CommerceDeliveryTotals;
  duplicateOrdersExcluded: number;
  grossProfitComplete: boolean;
  warnings: string[];
}

export interface CanonicalCommerceAggregate {
  orderNumbers: string[];
  orderCount: number;
  totalRevenueCents: number;
  grossCollectedCents: number;
  netCashActivityCents: number;
  netRevenueCents: number;
  totalTaxCents: number;
  merchandiseRevenueCents: number;
  feeRevenueCents?: number;
  deliveryRevenueCents: number;
  vendorDeliveryExpenseCents: number;
  deliveryTaxCents: number;
  deliveryTaxRefundCents: number;
  discountCents: number;
  cogsCents: number;
  customerFeeRefundCents: number;
  vendorCreditsCents: number;
  grossProfitCents: number;
  cogsAllocationCoverage: CogsAllocationCoverage;
  manualCostCoverage: ManualCostCoverage;
  grossProfitComplete: boolean;
}

export const emptyCommerceDeliveryTotals = (): CommerceDeliveryTotals => ({
  orderCount: 0,
  grossCollectedCents: 0,
  netCashActivityCents: 0,
  merchandiseRevenueCents: 0,
  feeRevenueCents: 0,
  deliveryRevenueCents: 0,
  vendorDeliveryExpenseCents: 0,
  deliveryTaxCents: 0,
  unclassifiedTaxCents: 0,
  discountCents: 0,
  cogsCents: 0,
  customerFeeRefundCents: 0,
  deliveryTaxRefundCents: 0,
  vendorCreditsCents: 0,
  netRevenueCents: 0,
  grossProfitCents: 0,
});

function cents(value: unknown) {
  if (typeof value === "number") return Math.round(value * 100);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Math.round((value as { toNumber: () => number }).toNumber() * 100);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function feeCents(value: unknown) {
  if (!Array.isArray(value)) return 0;
  return value.reduce((total, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return total;
    return total + Math.max(0, cents((entry as { amount?: unknown }).amount));
  }, 0);
}

export function idempotencyReference(orderNumber: string) {
  const match = /^(?:POS|WEB|OFF)-(.+)$/.exec(orderNumber.trim());
  return match?.[1] ?? null;
}

export function canonicalSourceSummaryFromAggregate(
  aggregate: CanonicalCommerceAggregate,
): CommerceDeliverySourceSummary {
  return {
    source: "canonical",
    totals: {
      orderCount: aggregate.orderCount,
      grossCollectedCents: aggregate.grossCollectedCents,
      netCashActivityCents: aggregate.netCashActivityCents,
      merchandiseRevenueCents: aggregate.merchandiseRevenueCents,
      feeRevenueCents: aggregate.feeRevenueCents ?? 0,
      deliveryRevenueCents: aggregate.deliveryRevenueCents,
      vendorDeliveryExpenseCents: aggregate.vendorDeliveryExpenseCents,
      deliveryTaxCents: aggregate.deliveryTaxCents,
      unclassifiedTaxCents: Math.max(
        0,
        aggregate.totalTaxCents - aggregate.deliveryTaxCents,
      ),
      discountCents: aggregate.discountCents,
      cogsCents: aggregate.cogsCents,
      customerFeeRefundCents: aggregate.customerFeeRefundCents,
      deliveryTaxRefundCents: aggregate.deliveryTaxRefundCents,
      vendorCreditsCents: aggregate.vendorCreditsCents,
      netRevenueCents: aggregate.netRevenueCents,
      grossProfitCents: aggregate.grossProfitCents,
    },
    orderNumbers: aggregate.orderNumbers,
    unallocatedCogsOrderCount: 0,
    untrackedVendorExpenseOrderCount: 0,
    cogsAllocationCoverage: aggregate.cogsAllocationCoverage,
    manualCostCoverage: aggregate.manualCostCoverage,
    grossProfitComplete: aggregate.grossProfitComplete,
  };
}

function addTotals(
  left: CommerceDeliveryTotals,
  right: CommerceDeliveryTotals,
): CommerceDeliveryTotals {
  return Object.fromEntries(
    Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).map((key) => [
      key,
      (left[key as keyof CommerceDeliveryTotals] ?? 0) +
        (right[key as keyof CommerceDeliveryTotals] ?? 0),
    ]),
  ) as unknown as CommerceDeliveryTotals;
}

export function combineCommerceDeliverySummaries(input: {
  period: { from: string; to: string };
  canonical: CommerceDeliverySourceSummary;
  legacyWeb: CommerceDeliverySourceSummary;
  duplicateOrdersExcluded?: number;
}) {
  const duplicateOrdersExcluded = input.duplicateOrdersExcluded ?? 0;
  const warnings: string[] = [];
  if (input.canonical.available === false) {
    warnings.push("Canonical ledger is unavailable. These are partial totals from legacy web sales only; canonical sales and costs are not included.");
  }
  if (input.legacyWeb.available === false) {
    warnings.push("Legacy web ledger is unavailable. These are partial totals from canonical sales only; legacy web sales and costs are not included.");
  }
  if (input.legacyWeb.unallocatedCogsOrderCount > 0) {
    warnings.push(
      `${input.legacyWeb.unallocatedCogsOrderCount} legacy web order(s) have no FIFO allocation, so known gross profit excludes their missing COGS.`,
    );
  }
  const canonicalCoverage = input.canonical.cogsAllocationCoverage;
  if (
    canonicalCoverage &&
    (canonicalCoverage.partiallyAllocatedLineCount > 0 ||
      canonicalCoverage.unallocatedLineCount > 0 ||
      canonicalCoverage.unallocatedQuantity > 0)
  ) {
    warnings.push(
      `Canonical inventory COGS allocation is ${(
        canonicalCoverage.coverageBps / 100
      ).toFixed(2)}% complete; ${canonicalCoverage.partiallyAllocatedLineCount} partially allocated and ${canonicalCoverage.unallocatedLineCount} unallocated line(s) remain.`,
    );
  }
  const manualCostCoverage = input.canonical.manualCostCoverage;
  if (manualCostCoverage && !manualCostCoverage.complete) {
    warnings.push(
      `${manualCostCoverage.unknownCostLineCount} canonical manual line(s) have unknown cost; known gross profit excludes those missing costs.`,
    );
  }
  if (input.legacyWeb.untrackedVendorExpenseOrderCount > 0) {
    warnings.push(
      `${input.legacyWeb.untrackedVendorExpenseOrderCount} legacy web delivery order(s) did not persist vendor expense separately, so known gross profit cannot include that historical cost.`,
    );
  }
  if (input.legacyWeb.totals.unclassifiedTaxCents > 0) {
    warnings.push(
      "Legacy web tax was stored as one amount; only canonical delivery tax is shown in the delivery-tax column.",
    );
  }
  if (duplicateOrdersExcluded > 0) {
    warnings.push(
      `${duplicateOrdersExcluded} mirrored legacy order(s) were excluded using their stable checkout idempotency reference.`,
    );
  }

  return {
    period: input.period,
    canonical: input.canonical,
    legacyWeb: input.legacyWeb,
    combined: addTotals(input.canonical.totals, input.legacyWeb.totals),
    duplicateOrdersExcluded,
    grossProfitComplete:
      input.canonical.available !== false &&
      input.legacyWeb.available !== false &&
      input.legacyWeb.unallocatedCogsOrderCount === 0 &&
      input.legacyWeb.untrackedVendorExpenseOrderCount === 0 &&
      input.canonical.grossProfitComplete &&
      (!canonicalCoverage ||
        (canonicalCoverage.partiallyAllocatedLineCount === 0 &&
          canonicalCoverage.unallocatedLineCount === 0 &&
          canonicalCoverage.unallocatedQuantity === 0)),
    warnings,
  } satisfies CombinedCommerceDeliverySummary;
}

export async function getLegacyWebCommerceSummary(
  businessId: string,
  period: { from: Date; to: Date },
  canonicalOrderNumbers: string[] = [],
): Promise<{
  summary: CommerceDeliverySourceSummary;
  duplicateOrdersExcluded: number;
}> {
  type LegacySaleRow = {
    id: string;
    orderNumber: string;
    subtotal: unknown;
    taxAmount: unknown;
    totalAmount: unknown;
    deliveryPrice: unknown;
    deliveryManagementId: string | null;
    deliveryAddress: string | null;
    fees: unknown;
  };
  type AllocationRow = {
    saleId: string;
    _sum: { extendedCost: unknown };
  };
  const canonicalReferences = new Set(
    canonicalOrderNumbers
      .map(idempotencyReference)
      .filter((value): value is string => Boolean(value)),
  );
  const rows = (await db.sales.findMany({
    where: {
      businessId,
      orderStatus: "completed",
      createdAt: { gte: period.from, lt: period.to },
    },
    select: {
      id: true,
      orderNumber: true,
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
      deliveryPrice: true,
      deliveryManagementId: true,
      deliveryAddress: true,
      fees: true,
    },
  })) as LegacySaleRow[];
  const sales = rows.filter((sale) => {
    const reference = idempotencyReference(sale.orderNumber);
    return !reference || !canonicalReferences.has(reference);
  });
  const duplicateOrdersExcluded = rows.length - sales.length;
  const saleIds = sales.map((sale) => sale.id);
  const allocationRows: AllocationRow[] = saleIds.length
    ? await db.salesLineItemAllocation.groupBy({
        by: ["saleId"],
        where: { saleId: { in: saleIds } },
        _sum: { extendedCost: true },
      })
    : [];
  const cogsBySaleId = new Map<string, number>(
    allocationRows.map((row) => [row.saleId, cents(row._sum.extendedCost)]),
  );
  const totals = emptyCommerceDeliveryTotals();
  let untrackedVendorExpenseOrderCount = 0;

  for (const sale of sales) {
    const grossMerchandiseCents = Math.max(0, cents(sale.subtotal));
    const taxCents = Math.max(0, cents(sale.taxAmount));
    const deliveryRevenueCents = Math.max(0, cents(sale.deliveryPrice));
    const miscFeeCents = feeCents(sale.fees);
    const grossCollectedCents = Math.max(0, cents(sale.totalAmount));
    const merchandiseRevenueCents = Math.max(
      0,
      grossCollectedCents - taxCents - deliveryRevenueCents - miscFeeCents,
    );
    const discountCents = Math.max(
      0,
      grossMerchandiseCents - merchandiseRevenueCents,
    );
    const cogsCents = cogsBySaleId.get(sale.id) ?? 0;

    totals.orderCount += 1;
    totals.grossCollectedCents += grossCollectedCents;
    totals.netCashActivityCents += grossCollectedCents;
    totals.merchandiseRevenueCents += merchandiseRevenueCents;
    totals.deliveryRevenueCents += deliveryRevenueCents;
    totals.unclassifiedTaxCents += taxCents;
    totals.discountCents += discountCents;
    totals.cogsCents += cogsCents;
    totals.feeRevenueCents = (totals.feeRevenueCents ?? 0) + miscFeeCents;
    totals.netRevenueCents += merchandiseRevenueCents + miscFeeCents + deliveryRevenueCents;
    totals.grossProfitCents +=
      merchandiseRevenueCents + miscFeeCents + deliveryRevenueCents - cogsCents;
    const hasLegacyDeliveryMarker = Boolean(
      deliveryRevenueCents > 0 ||
        sale.deliveryManagementId ||
        sale.deliveryAddress?.trim(),
    );
    if (hasLegacyDeliveryMarker) untrackedVendorExpenseOrderCount += 1;
  }

  return {
    summary: {
      source: "legacy_web",
      totals,
      orderNumbers: sales.map((sale) => sale.orderNumber),
      unallocatedCogsOrderCount: sales.filter(
        (sale) => !cogsBySaleId.has(sale.id),
      ).length,
      untrackedVendorExpenseOrderCount,
      cogsAllocationCoverage: null,
      manualCostCoverage: null,
      grossProfitComplete:
        sales.every((sale) => cogsBySaleId.has(sale.id)) &&
        untrackedVendorExpenseOrderCount === 0,
    },
    duplicateOrdersExcluded,
  };
}
