import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const getDailySalesAggregate = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");

    // Calculate start of today (UTC 00:00:00)
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("orderStatus"), "completed"),
          q.gte(q.field("createdAt"), startOfToday)
        )
      )
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
