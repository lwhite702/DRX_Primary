import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { appendCreditEntry, positiveCreditCents } from "./helpers/creditLedger";

const transaction = v.object({ id: v.string(), businessId: v.string(), customerId: v.string(), amount: v.number(), transactionType: v.string(), description: v.optional(v.string()), status: v.string(), createdBy: v.string(), createdAt: v.string(), balanceAfter: v.number(), dueDate: v.optional(v.string()) });
function project(entry: Doc<"creditEntries">) {
  return { id: entry._id, businessId: entry.businessId, customerId: entry.customerId, amount: Math.abs(entry.deltaCents) / 100, transactionType: entry.kind === "issue" ? "extension" : entry.kind === "sale" ? "purchase" : entry.kind, description: entry.description, status: entry.kind === "opening" ? "unreconciled" : "completed", createdBy: entry.createdBy, createdAt: new Date(entry.createdAt).toISOString(), balanceAfter: entry.balanceAfterCents / 100, dueDate: entry.dueAt === undefined ? undefined : new Date(entry.dueAt).toISOString() };
}
async function access(ctx: QueryCtx, businessId: string, writing: boolean) {
  const auth = await requireUserAndBusiness(ctx);
  requirePermission(auth.userRecord, writing ? "PROCESS_CHECKOUT" : "VIEW_FINANCIALS");
  if (businessId !== auth.businessId && businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
  return auth;
}
async function customerFor(ctx: QueryCtx, auth: Awaited<ReturnType<typeof access>>, value: string) {
  const id = ctx.db.normalizeId("customers", value);
  const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", value)).unique();
  if (!customer || customer.businessId !== auth.businessId) throw new Error("NOT_FOUND: Customer is unavailable");
  return customer;
}
export const create = mutation({
  args: { businessId: v.string(), customerId: v.string(), kind: v.union(v.literal("issue"), v.literal("payment")), amountCents: v.number(), requestKey: v.string(), dueAt: v.optional(v.number()), description: v.optional(v.string()) },
  returns: transaction,
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId, true);
    const customer = await customerFor(ctx, auth, args.customerId);
    if (!customer.isActive) throw new Error("NOT_FOUND: Customer is unavailable");
    const amount = positiveCreditCents(args.amountCents);
    await appendCreditEntry(ctx, { customer, userId: auth.userId, kind: args.kind, deltaCents: args.kind === "payment" ? -amount : amount, requestKey: args.requestKey, description: args.description, dueAt: args.dueAt });
    const entry = await ctx.db.query("creditEntries").withIndex("by_businessId_and_requestKey", q => q.eq("businessId", auth.businessId).eq("requestKey", args.requestKey)).unique();
    if (!entry) throw new Error("INVALID_STATE: Transaction was not recorded");
    return project(entry);
  },
});
export const listPage = query({
  args: { businessId: v.string(), customerId: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(transaction), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId, false);
    const customer = args.customerId ? await customerFor(ctx, auth, args.customerId) : null;
    const source = customer ? ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customer._id)) : ctx.db.query("creditEntries").withIndex("by_businessId", q => q.eq("businessId", auth.businessId));
    const page = await source.order("desc").paginate({ ...args.paginationOpts, numItems: Math.max(1, Math.min(100, args.paginationOpts.numItems)) });
    if (page.page.some(entry => entry.businessId !== auth.businessId)) throw new Error("INVALID_STATE: Transaction ownership requires reconciliation");
    return { page: page.page.map(project), isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
