import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { appendCreditEntry, positiveCreditCents, creditRequestKey } from "./helpers/creditLedger";

export const configureCustomerCredit = mutation({
  args: { customerId: v.id("customers"), creditEnabled: v.boolean(), creditLimitCents: v.number() },
  returns: v.object({ customerId: v.id("customers"), creditEnabled: v.boolean(), creditLimitCents: v.number(), totalCreditUsedCents: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    if (!Number.isSafeInteger(args.creditLimitCents) || args.creditLimitCents < 0) throw new Error("INVALID_ARGUMENT: Credit limit must be nonnegative integer cents");
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer record not found");
    const now = Date.now();
    await ctx.db.patch(customer._id, { creditEnabled: args.creditEnabled, creditLimitCents: args.creditLimitCents, updatedAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_CREDIT_POLICY_CHANGED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ previousEnabled: customer.creditEnabled !== false, previousLimitCents: customer.creditLimitCents, enabled: args.creditEnabled, limitCents: args.creditLimitCents }), timestamp: now });
    return { customerId: customer._id, creditEnabled: args.creditEnabled, creditLimitCents: args.creditLimitCents, totalCreditUsedCents: customer.totalCreditUsedCents };
  },
});

/** Atomically resolves an uncertain attempt or prevents it from committing later. */
export const resolvePendingRequest = mutation({
  args: { customerId: v.id("customers"), requestKey: v.string() },
  returns: v.union(
    v.object({ status: v.literal("recorded"), balanceAfterCents: v.number() }),
    v.object({ status: v.literal("cancelled") }),
  ),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    creditRequestKey(args.requestKey);
    const customer = await ctx.db.get(args.customerId);
    // Inactive accounts must still allow recovery of an earlier attempt.
    if (!customer || customer.businessId !== auth.businessId) throw new Error("NOT_FOUND: Customer record not found");
    const prior = await ctx.db.query("creditEntries").withIndex("by_businessId_and_requestKey", q => q.eq("businessId", auth.businessId).eq("requestKey", args.requestKey)).unique();
    if (prior) {
      if (prior.customerId !== customer._id) throw new Error("IDEMPOTENCY_CONFLICT: Request belongs to another customer");
      return { status: "recorded" as const, balanceAfterCents: prior.balanceAfterCents };
    }
    const cancellation = await ctx.db.query("creditRequestCancellations").withIndex("by_businessId_and_requestKey", q => q.eq("businessId", auth.businessId).eq("requestKey", args.requestKey)).unique();
    if (cancellation && cancellation.customerId !== customer._id) throw new Error("IDEMPOTENCY_CONFLICT: Request belongs to another customer");
    if (!cancellation) {
      const now = Date.now();
      await ctx.db.insert("creditRequestCancellations", { businessId: auth.businessId, customerId: customer._id, requestKey: args.requestKey, createdBy: auth.userId, createdAt: now });
      await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_CREDIT_REQUEST_CANCELLED", entityType: "customer", entityId: customer._id, metadata: "{}", timestamp: now });
    }
    return { status: "cancelled" as const };
  },
});

export const issueCustomerCredit = mutation({
  args: { customerId: v.id("customers"), amountCents: v.number(), dueAt: v.optional(v.number()), description: v.optional(v.string()), requestKey: v.optional(v.string()) },
  returns: v.object({ customerId: v.id("customers"), newCreditUsedCents: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer record not found");
    const balance = await appendCreditEntry(ctx, { customer, userId: auth.userId, kind: "issue", deltaCents: positiveCreditCents(args.amountCents), requestKey: args.requestKey, description: args.description, dueAt: args.dueAt });
    return { customerId: args.customerId, newCreditUsedCents: balance };
  },
});

export const recordCreditPayment = mutation({
  args: { customerId: v.id("customers"), paymentAmountCents: v.number(), requestKey: v.optional(v.string()) },
  returns: v.object({ customerId: v.id("customers"), remainingCreditUsedCents: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer record not found");
    const balance = await appendCreditEntry(ctx, { customer, userId: auth.userId, kind: "payment", deltaCents: -positiveCreditCents(args.paymentAmountCents), requestKey: args.requestKey });
    return { customerId: args.customerId, remainingCreditUsedCents: balance };
  },
});
