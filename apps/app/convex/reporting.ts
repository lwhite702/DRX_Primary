import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const getDailySalesAggregate = query({
  args: { clerkUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) => q.eq(q.field("orderStatus"), "completed"))
      .collect();

    let totalRevenueCents = 0;
    let totalTaxCents = 0;
    let totalSubtotalCents = 0;

    for (const sale of sales) {
      totalRevenueCents += sale.totalAmountCents;
      totalTaxCents += sale.taxAmountCents;
      totalSubtotalCents += sale.subtotalCents;
    }

    const orderCount = sales.length;
    const averageOrderValueCents = orderCount > 0 ? Math.round(totalRevenueCents / orderCount) : 0;

    return {
      orderCount,
      totalRevenueCents,
      totalTaxCents,
      totalSubtotalCents,
      averageOrderValueCents,
    };
  },
});
