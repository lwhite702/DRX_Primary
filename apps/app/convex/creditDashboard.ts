import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

function validCents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_STATE: Credit amounts require reconciliation");
}
const allocationStatus = v.union(v.literal("missing"), v.literal("pending"), v.literal("ready"), v.literal("unreconciled"));

export const resolveScope = query({
  args: { businessId: v.string(), expectedUserId: v.string(), customerId: v.optional(v.string()) },
  returns: v.object({ businessId: v.id("businesses"), customerId: v.optional(v.id("customers")) }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    if (args.customerId === undefined) return { businessId: auth.businessId };
    const id = ctx.db.normalizeId("customers", args.customerId);
    const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.customerId!)).unique();
    if (!customer || customer.businessId !== auth.businessId) throw new Error("NOT_FOUND: Customer is unavailable");
    return { businessId: auth.businessId, customerId: customer._id };
  },
});

export const accountsPage = query({
  args: { businessId: v.string(), expectedUserId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ customerId: v.id("customers"), displayName: v.string(), isActive: v.boolean(), creditEnabled: v.boolean(), limitCents: v.number(), unlimited: v.boolean(), balanceCents: v.number(), allocationStatus })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    if (!Number.isSafeInteger(args.paginationOpts.numItems) || args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100) throw new Error("INVALID_ARGUMENT: Page size must be between 1 and 100");
    const result = await ctx.db.query("customers").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map(async customer => {
      validCents(customer.totalCreditUsedCents); validCents(customer.creditLimitCents);
      const account = await ctx.db.query("creditAccounts").withIndex("by_customerId", q => q.eq("customerId", customer._id)).unique();
      const state = await ctx.db.query("creditAllocationState").withIndex("by_customerId", q => q.eq("customerId", customer._id)).unique();
      if ((account && account.businessId !== auth.businessId) || (state && state.businessId !== auth.businessId)) throw new Error("INVALID_STATE: Credit projection ownership requires reconciliation");
      if (account) validCents(account.balanceCents);
      if (state) {
        validCents(state.outstandingCents);
        if (state.pendingPaymentCents !== undefined) validCents(state.pendingPaymentCents);
      }
      let status: "missing" | "pending" | "ready" | "unreconciled" = !state ? "missing" : state.status;
      if ((!account && customer.totalCreditUsedCents > 0) || (account && account.balanceCents !== customer.totalCreditUsedCents)) status = "unreconciled";
      else if (state?.status === "ready") {
        if (state.outstandingCents !== customer.totalCreditUsedCents || state.pendingPaymentId || state.pendingPaymentCents !== undefined) status = "unreconciled";
        // appendCreditEntry creates the opening entry first. Its debt lookup is
        // indexed and bounded; never scan all historical debt for a dashboard.
        const opening = await ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customer._id)).order("asc").first();
        if (opening) {
          if (opening.businessId !== auth.businessId) throw new Error("INVALID_STATE: Credit entry ownership requires reconciliation");
          if (opening.openingSource !== undefined) {
            validCents(opening.deltaCents);
            const debt = await ctx.db.query("creditDebts").withIndex("by_entryId", q => q.eq("entryId", opening._id)).unique();
            if (debt && (debt.businessId !== auth.businessId || debt.customerId !== customer._id)) throw new Error("INVALID_STATE: Credit debt ownership requires reconciliation");
            if (debt) {
              validCents(debt.remainingCents); validCents(debt.principalCents);
              if (debt.remainingCents > debt.principalCents) throw new Error("INVALID_STATE: Credit debt requires reconciliation");
            }
            if ((debt && debt.remainingCents > 0) || (!debt && opening.deltaCents > 0)) status = "unreconciled";
          }
        } else if (customer.totalCreditUsedCents > 0) status = "unreconciled";
      }
      const enabled = customer.creditEnabled !== false;
      return { customerId: customer._id, displayName: `Account ${customer._id.slice(-8)}`, isActive: customer.isActive, creditEnabled: enabled, limitCents: customer.creditLimitCents, unlimited: enabled && customer.creditLimitCents === 0, balanceCents: customer.totalCreditUsedCents, allocationStatus: status };
    }));
    return { page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
