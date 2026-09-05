import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

const DAY_MS = 24 * 60 * 60 * 1_000;

const aggregateRecord = v.object({
  periodStartAt: v.number(),
  periodEndAt: v.number(),
  timezone: v.literal("UTC"),
  periodEndExclusive: v.literal(true),
  accountingBasis: v.literal("operational_event"),
  cashAccrualClassification: v.literal("not_gaap_cash_or_accrual"),
  saleRecognitionField: v.literal("sales.createdAt"),
  adjustmentRecognitionField: v.literal(
    "deliveryFinancialAdjustments.createdAt",
  ),
  orderNumbers: v.array(v.string()),
  orderCount: v.number(),
  totalRevenueCents: v.number(),
  grossCollectedCents: v.number(),
  netCashActivityCents: v.number(),
  netRevenueCents: v.number(),
  totalTaxCents: v.number(),
  totalSubtotalCents: v.number(),
  averageOrderValueCents: v.number(),
  merchandiseRevenueCents: v.number(),
  deliveryRevenueCents: v.number(),
  vendorDeliveryExpenseCents: v.number(),
  deliveryTaxCents: v.number(),
  deliveryTaxRefundCents: v.number(),
  discountCents: v.number(),
  cogsCents: v.number(),
  cogsAllocationCoverage: v.object({
    inventoryLineCount: v.number(),
    fullyAllocatedLineCount: v.number(),
    partiallyAllocatedLineCount: v.number(),
    unallocatedLineCount: v.number(),
    expectedQuantity: v.number(),
    allocatedQuantity: v.number(),
    unallocatedQuantity: v.number(),
    coverageBps: v.number(),
  }),
  manualCostCoverage: v.object({
    manualLineCount: v.number(),
    knownCostLineCount: v.number(),
    unknownCostLineCount: v.number(),
    knownManualCogsCents: v.number(),
    complete: v.boolean(),
  }),
  customerFeeRefundCents: v.number(),
  vendorCreditsCents: v.number(),
  grossProfitCents: v.number(),
  grossProfitComplete: v.boolean(),
});

function validatePeriod(startAt: number, endAt: number): void {
  if (!Number.isSafeInteger(startAt) || !Number.isSafeInteger(endAt)) {
    throw new Error(
      "INVALID_ARGUMENT: startAt and endAt must be integer UTC timestamps",
    );
  }
  if (endAt <= startAt) {
    throw new Error("INVALID_ARGUMENT: endAt must be greater than startAt");
  }
}

async function aggregatePeriod(
  ctx: QueryCtx,
  businessId: Id<"businesses">,
  startAt: number,
  endAt: number,
) {
  validatePeriod(startAt, endAt);
  const [sales, adjustments] = await Promise.all([
    ctx.db
      .query("sales")
      .withIndex("by_businessId_and_orderStatus_and_createdAt", (q) =>
        q
          .eq("businessId", businessId)
          .eq("orderStatus", "completed")
          .gte("createdAt", startAt)
          .lt("createdAt", endAt),
      )
      .collect(),
    ctx.db
      .query("deliveryFinancialAdjustments")
      .withIndex("by_businessId_and_createdAt", (q) =>
        q
          .eq("businessId", businessId)
          .gte("createdAt", startAt)
          .lt("createdAt", endAt),
      )
      .collect(),
  ]);

  let grossCollectedCents = 0;
  let saleTaxCents = 0;
  let totalSubtotalCents = 0;
  let merchandiseRevenueCents = 0;
  let deliveryRevenueCents = 0;
  let vendorDeliveryExpenseCents = 0;
  let saleDeliveryTaxCents = 0;
  let discountCents = 0;
  let cogsCents = 0;
  let inventoryLineCount = 0;
  let fullyAllocatedLineCount = 0;
  let partiallyAllocatedLineCount = 0;
  let unallocatedLineCount = 0;
  let expectedQuantity = 0;
  let allocatedQuantity = 0;
  let manualLineCount = 0;
  let knownCostLineCount = 0;
  let unknownCostLineCount = 0;
  let knownManualCogsCents = 0;

  const [allLineItems, allAllocations] = await Promise.all([
    Promise.all(
      sales.map((sale) =>
        ctx.db
          .query("salesLineItems")
          .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
          .collect(),
      ),
    ),
    Promise.all(
      sales.map((sale) =>
        ctx.db
          .query("salesAllocations")
          .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
          .collect(),
      ),
    ),
  ]);

  for (let i = 0; i < sales.length; i++) {
    const sale = sales[i];
    const lineItems = allLineItems[i];
    const allocations = allAllocations[i];
    grossCollectedCents += sale.totalAmountCents;
    saleTaxCents += sale.taxAmountCents;
    totalSubtotalCents += sale.subtotalCents;
    merchandiseRevenueCents +=
      sale.merchandiseRevenueCents ?? sale.subtotalCents;
    deliveryRevenueCents += sale.deliveryRevenueCents ?? 0;
    vendorDeliveryExpenseCents += sale.vendorDeliveryExpenseCents ?? 0;
    saleDeliveryTaxCents += sale.deliveryTaxCents ?? 0;
    discountCents += sale.discountCents ?? 0;
    if (lineItems.length === 0) {
      cogsCents += sale.cogsCents ?? 0;
      continue;
    }
    cogsCents += allocations.reduce(
      (total, allocation) => total + allocation.extendedCostCents,
      0,
    );
    for (const lineItem of lineItems) {
      if (lineItem.source !== "manual") continue;
      manualLineCount += 1;
      if (lineItem.manualCostKnown === true) {
        knownCostLineCount += 1;
        const lineCogsCents = Math.round(
          lineItem.quantityGrams * lineItem.unitCostCents,
        );
        knownManualCogsCents += lineCogsCents;
        cogsCents += lineCogsCents;
      } else {
        unknownCostLineCount += 1;
      }
    }
    const allocatedByLineItem = new Map<string, number>();
    for (const allocation of allocations) {
      const lineItemId = String(allocation.lineItemId);
      allocatedByLineItem.set(
        lineItemId,
        (allocatedByLineItem.get(lineItemId) ?? 0) + allocation.quantityGrams,
      );
    }
    for (const lineItem of lineItems) {
      if (lineItem.source === "manual") continue;
      const expected = lineItem.quantityGrams;
      const allocated = allocatedByLineItem.get(String(lineItem._id)) ?? 0;
      inventoryLineCount += 1;
      expectedQuantity += expected;
      allocatedQuantity += allocated;
      if (allocated <= 1e-8) {
        unallocatedLineCount += 1;
      } else if (allocated + 1e-8 < expected) {
        partiallyAllocatedLineCount += 1;
      } else {
        fullyAllocatedLineCount += 1;
      }
    }
  }

  expectedQuantity = Math.round(expectedQuantity * 1_000_000) / 1_000_000;
  allocatedQuantity = Math.round(allocatedQuantity * 1_000_000) / 1_000_000;
  const unallocatedQuantity =
    Math.round(Math.max(0, expectedQuantity - allocatedQuantity) * 1_000_000) /
    1_000_000;
  const coverageBps =
    expectedQuantity === 0
      ? 10_000
      : Math.min(
          10_000,
          Math.round((allocatedQuantity / expectedQuantity) * 10_000),
        );
  const manualCostComplete = unknownCostLineCount === 0;
  const grossProfitComplete =
    coverageBps === 10_000 && manualCostComplete;

  let customerFeeRefundCents = 0;
  let vendorCreditsCents = 0;
  let deliveryTaxRefundCents = 0;
  for (const adjustment of adjustments) {
    if (adjustment.kind === "customer_fee_refund") {
      customerFeeRefundCents += adjustment.amountCents;
    } else if (adjustment.kind === "vendor_credit") {
      vendorCreditsCents += adjustment.amountCents;
    } else if (adjustment.kind === "delivery_tax_refund") {
      deliveryTaxRefundCents += adjustment.amountCents;
    }
  }

  const netCashActivityCents =
    grossCollectedCents - customerFeeRefundCents - deliveryTaxRefundCents;
  const netRevenueCents =
    merchandiseRevenueCents + deliveryRevenueCents - customerFeeRefundCents;
  const grossProfitCents =
    netRevenueCents -
    cogsCents -
    vendorDeliveryExpenseCents +
    vendorCreditsCents;
  const orderCount = sales.length;

  return {
    periodStartAt: startAt,
    periodEndAt: endAt,
    timezone: "UTC" as const,
    periodEndExclusive: true as const,
    accountingBasis: "operational_event" as const,
    cashAccrualClassification: "not_gaap_cash_or_accrual" as const,
    saleRecognitionField: "sales.createdAt" as const,
    adjustmentRecognitionField:
      "deliveryFinancialAdjustments.createdAt" as const,
    orderNumbers: sales.map((sale) => sale.orderNumber),
    orderCount,
    totalRevenueCents: grossCollectedCents,
    grossCollectedCents,
    netCashActivityCents,
    netRevenueCents,
    totalTaxCents: saleTaxCents - deliveryTaxRefundCents,
    totalSubtotalCents,
    averageOrderValueCents:
      orderCount > 0 ? Math.round(grossCollectedCents / orderCount) : 0,
    merchandiseRevenueCents,
    deliveryRevenueCents,
    vendorDeliveryExpenseCents,
    deliveryTaxCents: saleDeliveryTaxCents - deliveryTaxRefundCents,
    deliveryTaxRefundCents,
    discountCents,
    cogsCents,
    cogsAllocationCoverage: {
      inventoryLineCount,
      fullyAllocatedLineCount,
      partiallyAllocatedLineCount,
      unallocatedLineCount,
      expectedQuantity,
      allocatedQuantity,
      unallocatedQuantity,
      coverageBps,
    },
    manualCostCoverage: {
      manualLineCount,
      knownCostLineCount,
      unknownCostLineCount,
      knownManualCogsCents,
      complete: manualCostComplete,
    },
    customerFeeRefundCents,
    vendorCreditsCents,
    grossProfitCents,
    grossProfitComplete,
  };
}

export const getSalesAggregate = query({
  args: {
    startAt: v.number(),
    endAt: v.number(),
    timezone: v.literal("UTC"),
  },
  returns: aggregateRecord,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    return aggregatePeriod(ctx, auth.businessId, args.startAt, args.endAt);
  },
});

// Backward-compatible daily view: the current UTC calendar day, [start, end).
export const getDailySalesAggregate = query({
  args: {},
  returns: aggregateRecord,
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const now = new Date();
    const startAt = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    return aggregatePeriod(ctx, auth.businessId, startAt, startAt + DAY_MS);
  },
});
