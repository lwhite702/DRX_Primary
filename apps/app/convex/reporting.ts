import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

const LOSS_TYPES = new Set(["shrinkage", "spill", "damage"]);

async function buildFinancialReport(
  ctx: QueryCtx,
  businessId: Id<"businesses">,
  startDate: number,
  endDate: number,
) {
  const allSales = await ctx.db
    .query("sales")
    .withIndex("by_businessId", (q) => q.eq("businessId", businessId))
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
    .withIndex("by_businessId", (q) => q.eq("businessId", businessId))
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
}

export const getDailySalesAggregate = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const now = new Date();
    const startOfToday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    return buildFinancialReport(
      ctx,
      auth.businessId,
      startOfToday,
      now.getTime(),
    );
  },
});

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
    return buildFinancialReport(ctx, auth.businessId, startDate, endDate);
  },
});
