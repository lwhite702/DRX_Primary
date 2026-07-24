import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const issueCustomerCredit = mutation({
  args: {
    customerId: v.id("customers"),
    amountCents: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId) {
      throw new Error("NOT_FOUND: Customer record not found");
    }

    if (args.amountCents <= 0) {
      throw new Error("INVALID_ARGUMENT: Credit amount must be positive");
    }

    const newCreditUsed = customer.totalCreditUsedCents + args.amountCents;
    if (customer.creditLimitCents > 0 && newCreditUsed > customer.creditLimitCents) {
      throw new Error(
        `CREDIT_LIMIT_EXCEEDED: Credit requested (${newCreditUsed}¢) exceeds limit (${customer.creditLimitCents}¢)`
      );
    }

    await ctx.db.patch(args.customerId, {
      totalCreditUsedCents: newCreditUsed,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "CUSTOMER_CREDIT_ISSUED",
      entityType: "customer",
      entityId: args.customerId,
      metadata: JSON.stringify({ amountCents: args.amountCents, description: args.description }),
      timestamp: Date.now(),
    });

    return { customerId: args.customerId, newCreditUsedCents: newCreditUsed };
  },
});

export const recordCreditPayment = mutation({
  args: {
    customerId: v.id("customers"),
    paymentAmountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId) {
      throw new Error("NOT_FOUND: Customer record not found");
    }

    const newCreditUsed = Math.max(0, customer.totalCreditUsedCents - args.paymentAmountCents);

    await ctx.db.patch(args.customerId, {
      totalCreditUsedCents: newCreditUsed,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "CUSTOMER_CREDIT_PAYMENT",
      entityType: "customer",
      entityId: args.customerId,
      metadata: JSON.stringify({ paymentAmountCents: args.paymentAmountCents }),
      timestamp: Date.now(),
    });

    return { customerId: args.customerId, remainingCreditUsedCents: newCreditUsed };
  },
});
