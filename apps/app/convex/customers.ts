import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";

export const createCustomer = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    creditLimitCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    const now = Date.now();

    const customerId = await ctx.db.insert("customers", {
      businessId: auth.businessId,
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      email: args.email,
      totalPurchasesCents: 0,
      totalCreditUsedCents: 0,
      creditLimitCents: args.creditLimitCents || 0,
      purchaseCount: 0,
      loyaltyTier: "standard",
      discountRateBps: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "CUSTOMER_REGISTERED",
      entityType: "customer",
      entityId: customerId,
      metadata: JSON.stringify({
        name: `${args.firstName || ""} ${args.lastName || ""}`.trim(),
        phone: args.phoneNumber,
      }),
      timestamp: now,
    });

    return customerId;
  },
});

export const listCustomers = query({
  args: {
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return customers;
  },
});
