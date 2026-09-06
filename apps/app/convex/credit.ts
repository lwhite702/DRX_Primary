import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { appendCreditEntry, positiveCreditCents } from "./helpers/creditLedger";

export const issueCustomerCredit = mutation({
  args: { customerId: v.id("customers"), amountCents: v.number(), description: v.optional(v.string()), requestKey: v.optional(v.string()) },
  returns: v.object({ customerId: v.id("customers"), newCreditUsedCents: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer record not found");
    const balance = await appendCreditEntry(ctx, { customer, userId: auth.userId, kind: "issue", deltaCents: positiveCreditCents(args.amountCents), requestKey: args.requestKey, description: args.description });
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
