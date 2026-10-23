import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { businessDateKey, businessDayBounds, isValidTimeZone } from "./helpers/businessTimezone";

const aggregateRecord = v.object({
  periodStartAt: v.number(),
  periodEndAt: v.number(),
  timezone: v.string(),
  periodEndExclusive: v.literal(true),
  accountingBasis: v.literal("operational_event"),
  cashAccrualClassification: v.literal("not_gaap_cash_or_accrual"),
  saleRecognitionField: v.literal("sales.createdAt"),
  adjustmentRecognitionField: v.literal(
    "deliveryFinancialAdjustments.createdAt",
  ),
  orderNumbers: v.array(v.string()),
  topProducts: v.array(v.object({
    id: v.string(),
    name: v.string(),
    sku: v.string(),
    quantitySoldGrams: v.number(),
    revenueCents: v.number(),
  })),
  paymentMethodTotalsCents: v.record(v.string(), v.number()),
  orderCount: v.number(),
  totalRevenueCents: v.number(),
  grossCollectedCents: v.number(),
  cashSalesCents: v.number(),
  netCashActivityCents: v.number(),
  netRevenueCents: v.number(),
  totalTaxCents: v.number(),
  totalSubtotalCents: v.number(),
  averageOrderValueCents: v.number(),
  merchandiseRevenueCents: v.number(),
  feeRevenueCents: v.optional(v.number()),
  deliveryRevenueCents: v.number(),
  vendorDeliveryExpenseCents: v.number(),
  unknownVendorExpenseOrderCount: v.optional(v.number()),
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
  timezone: string = "UTC",
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
  let cashSalesCents = 0;
  let saleTaxCents = 0;
  let totalSubtotalCents = 0;
  let merchandiseRevenueCents = 0;
  let feeRevenueCents = 0;
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
  const productIds = Array.from(new Set(allLineItems.flat().flatMap((line) => line.productId ? [line.productId] : [])));
  const productRecords = await Promise.all(productIds.map((id) => ctx.db.get(id)));
  const productsById = new Map(productRecords.filter((product) => product?.businessId === businessId).map((product) => [product!._id, product!]));
  const topProductsById = new Map<string, { id: string; name: string; sku: string; quantitySoldGrams: number; revenueCents: number }>();
  const paymentMethodTotalsCents = new Map<string, number>();

  for (let i = 0; i < sales.length; i++) {
    const sale = sales[i];
    const lineItems = allLineItems[i];
    const allocations = allAllocations[i];
    const merchandiseLineTotal = lineItems.reduce(
      (sum, line) => sum + line.lineTotalCents,
      0,
    );
    let discountRemaining = Math.min(
      sale.discountAmountCents ?? 0,
      merchandiseLineTotal,
    );
    let lineTotalRemaining = merchandiseLineTotal;
    for (const line of lineItems) {
      const lineDiscount = lineTotalRemaining > 0
        ? Math.min(line.lineTotalCents, Math.round(discountRemaining * line.lineTotalCents / lineTotalRemaining))
        : 0;
      discountRemaining -= lineDiscount;
      lineTotalRemaining -= line.lineTotalCents;
      if (!line.productId) continue;
      const product = productsById.get(line.productId);
      if (!product) continue;
      const aggregate = topProductsById.get(product._id) ?? {
        id: product._id,
        name: product.productName,
        sku: product.sku,
        quantitySoldGrams: 0,
        revenueCents: 0,
      };
      aggregate.quantitySoldGrams += line.quantityGrams;
      aggregate.revenueCents += line.lineTotalCents - lineDiscount;
      topProductsById.set(product._id, aggregate);
    }
    grossCollectedCents += sale.totalAmountCents;
    const tenders = sale.paymentTenders?.length
      ? sale.paymentTenders
      : sale.paymentMethod === "mixed"
        ? [
            { method: "cash", amountCents: Math.min(sale.totalAmountCents, sale.amountPaidCents) },
            { method: "credit", amountCents: sale.creditAmountCents ?? Math.max(0, sale.totalAmountCents - sale.amountPaidCents) },
          ].filter((tender) => tender.amountCents > 0)
        : [{ method: sale.paymentMethod, amountCents: sale.totalAmountCents }];
    for (const tender of tenders) {
      paymentMethodTotalsCents.set(
        tender.method,
        (paymentMethodTotalsCents.get(tender.method) ?? 0) + tender.amountCents,
      );
    }
    if (sale.paymentTenders?.length) {
      cashSalesCents += sale.paymentTenders
        .filter((tender) => tender.method === "cash")
        .reduce((sum, tender) => sum + tender.amountCents, 0);
    } else if (sale.paymentMethod === "mixed") {
      // Legacy mixed sales store the actually collected portion in amountPaidCents;
      // the remaining balance is tracked as customer credit.
      cashSalesCents += Math.min(sale.totalAmountCents, sale.amountPaidCents);
    } else if (sale.paymentMethod === "cash") {
      // Do not use amountPaidCents: it can include change returned to the buyer.
      cashSalesCents += sale.totalAmountCents;
    }
    saleTaxCents += sale.taxAmountCents;
    totalSubtotalCents += sale.subtotalCents;
    feeRevenueCents += sale.feeRevenueCents ?? 0;
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
    coverageBps === 10_000 && manualCostComplete && sales.every(sale => sale.vendorDeliveryExpenseKnown !== false);

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
    merchandiseRevenueCents + feeRevenueCents + deliveryRevenueCents - customerFeeRefundCents;
  const grossProfitCents =
    netRevenueCents -
    cogsCents -
    vendorDeliveryExpenseCents +
    vendorCreditsCents;
  const orderCount = sales.length;

  return {
    periodStartAt: startAt,
    periodEndAt: endAt,
    timezone,
    periodEndExclusive: true as const,
    accountingBasis: "operational_event" as const,
    cashAccrualClassification: "not_gaap_cash_or_accrual" as const,
    saleRecognitionField: "sales.createdAt" as const,
    adjustmentRecognitionField:
      "deliveryFinancialAdjustments.createdAt" as const,
    orderNumbers: sales.map((sale) => sale.orderNumber),
    topProducts: Array.from(topProductsById.values())
      .sort((left, right) => right.revenueCents - left.revenueCents)
      .slice(0, 5),
    paymentMethodTotalsCents: Object.fromEntries(paymentMethodTotalsCents),
    orderCount,
    totalRevenueCents: grossCollectedCents,
    grossCollectedCents,
    cashSalesCents,
    netCashActivityCents,
    netRevenueCents,
    totalTaxCents: saleTaxCents - deliveryTaxRefundCents,
    totalSubtotalCents,
    averageOrderValueCents:
      orderCount > 0 ? Math.round(grossCollectedCents / orderCount) : 0,
    merchandiseRevenueCents,
    ...(feeRevenueCents ? { feeRevenueCents } : {}),
    deliveryRevenueCents,
    vendorDeliveryExpenseCents,
    ...(sales.some(sale => sale.vendorDeliveryExpenseKnown === false) ? { unknownVendorExpenseOrderCount: sales.filter(sale => sale.vendorDeliveryExpenseKnown === false).length } : {}),
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
    timezone: v.string(),
  },
  returns: aggregateRecord,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    return aggregatePeriod(ctx, auth.businessId, args.startAt, args.endAt, args.timezone);
  },
});

// Dashboard day follows the active business calendar, with a half-open UTC interval.
export const getDailySalesAggregate = query({
  args: { dateKey: v.optional(v.string()) },
  returns: aggregateRecord,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const storedTimezone = auth.businessRecord.timezone;
    const timezone = storedTimezone && isValidTimeZone(storedTimezone)
      ? storedTimezone
      : "America/New_York";
    const dateKey = args.dateKey ?? businessDateKey(new Date(), timezone);
    const { startAt, endAt } = businessDayBounds(dateKey, timezone);
    return aggregatePeriod(ctx, auth.businessId, startAt, endAt, timezone);
  },
});

const LOSS_TYPES = new Set(["shrinkage", "spill", "damage"]);

export const getFinancialReport = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const startDate = args.startDate ?? 0;
    const endDate = args.endDate ?? Date.now();
    if (
      !Number.isFinite(startDate) ||
      !Number.isFinite(endDate) ||
      endDate < startDate
    ) {
      throw new Error(
        "INVALID_ARGUMENT: Financial report date range is invalid",
      );
    }

    const allSales = await ctx.db
      .query("sales")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .collect();
    const completedSales = allSales.filter(
      (sale) =>
        sale.orderStatus === "completed" &&
        sale.createdAt >= startDate &&
        sale.createdAt <= endDate,
    );

    let totalRevenueCents = 0;
    let totalTaxCents = 0;
    let totalSubtotalCents = 0;
    let totalDeliveryFeesCents = 0;
    let totalDiscountsCents = 0;
    let costOfGoodsSoldCents = 0;

    for (const sale of completedSales) {
      totalRevenueCents += sale.totalAmountCents;
      totalTaxCents += sale.taxAmountCents;
      totalSubtotalCents += sale.subtotalCents;
      totalDeliveryFeesCents += sale.deliveryFeeCents ?? 0;
      totalDiscountsCents += sale.discountAmountCents ?? 0;

      const allocations = await ctx.db
        .query("salesAllocations")
        .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
        .collect();
      costOfGoodsSoldCents += allocations.reduce(
        (total, allocation) => total + allocation.extendedCostCents,
        0,
      );
    }

    const stockAdjustments = await ctx.db
      .query("stockAdjustments")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .collect();
    const inventoryLossCents = stockAdjustments
      .filter(
        (adjustment) =>
          adjustment.createdAt >= startDate &&
          adjustment.createdAt <= endDate &&
          adjustment.direction === "decrease" &&
          LOSS_TYPES.has(adjustment.adjustmentType),
      )
      .reduce((total, adjustment) => total + adjustment.costLossCents, 0);

    let refundedScrapLossCents = 0;
    const scrapRefunds = allSales.filter(
      (sale) =>
        sale.orderStatus === "refunded" &&
        sale.refundDisposition === "scrap" &&
        (sale.refundedAt ?? 0) >= startDate &&
        (sale.refundedAt ?? 0) <= endDate,
    );
    for (const sale of scrapRefunds) {
      const allocations = await ctx.db
        .query("salesAllocations")
        .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
        .collect();
      refundedScrapLossCents += allocations.reduce(
        (total, allocation) => total + allocation.extendedCostCents,
        0,
      );
    }

    const orderCount = completedSales.length;
    const netRevenueCents = totalRevenueCents - totalTaxCents;
    const grossProfitCents = netRevenueCents - costOfGoodsSoldCents;
    const grossProfitMarginPercent =
      netRevenueCents > 0
        ? Math.round((grossProfitCents / netRevenueCents) * 10_000) / 100
        : 0;

    return {
      startDate,
      endDate,
      orderCount,
      totalRevenueCents,
      totalTaxCents,
      totalSubtotalCents,
      totalDeliveryFeesCents,
      totalDiscountsCents,
      netRevenueCents,
      costOfGoodsSoldCents,
      grossProfitCents,
      grossProfitMarginPercent,
      inventoryLossCents,
      refundedScrapLossCents,
      shrinkLossCents: inventoryLossCents + refundedScrapLossCents,
      averageOrderValueCents:
        orderCount > 0 ? Math.round(totalRevenueCents / orderCount) : 0,
    };
  },
});
