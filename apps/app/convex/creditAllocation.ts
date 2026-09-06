import { v } from "convex/values";
import { paginationOptsValidator, makeFunctionReference } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { creditDueAt } from "./helpers/creditLedger";
import type { Id } from "./_generated/dataModel";

const advanceRef = makeFunctionReference<"mutation", { customerId: Id<"customers"> }, null>("creditAllocation:advance");

/** Starts/retries the rebuild without altering the account or source transactions. */
export const refresh = mutation({
  args: { customerId: v.id("customers") }, returns: v.null(),
  handler: async (ctx, { customerId }) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.businessId !== auth.businessId) throw new Error("NOT_FOUND: Customer is unavailable");
    const state = await ctx.db.query("creditAllocationState").withIndex("by_customerId", q => q.eq("customerId", customerId)).unique();
    if (state && state.businessId !== auth.businessId) throw new Error("INVALID_STATE: Credit ownership requires reconciliation");
    if (!state) await ctx.db.insert("creditAllocationState", { customerId, businessId: auth.businessId, cursor: null, status: "pending", outstandingCents: 0, updatedAt: Date.now() });
    else await ctx.db.patch(state._id, { status: "pending", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, advanceRef, { customerId });
    return null;
  },
});

/** One source entry and at most 64 debts per transaction, including resumable large payments. */
export const advance = internalMutation({
  args: { customerId: v.id("customers") }, returns: v.null(),
  handler: async (ctx, { customerId }) => {
    const state = await ctx.db.query("creditAllocationState").withIndex("by_customerId", q => q.eq("customerId", customerId)).unique();
    if (!state || state.status === "ready") return null;
    if (!Number.isSafeInteger(state.outstandingCents) || state.outstandingCents < 0) throw new Error("INVALID_STATE: Invalid allocated balance");
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.businessId !== state.businessId) throw new Error("INVALID_STATE: Credit ownership requires reconciliation");
    const page = await ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customerId)).order("asc").paginate({ cursor: state.cursor, numItems: 1 });
    const entry = page.page[0];
    // End cursors represent infinity, so retain the cursor before the final
    // processed entry. Revisit that entry once when new rows arrive, without
    // applying it again, then advance with a non-terminal cursor.
    if (!entry || entry._id === state.lastEntryId) {
      if (entry && entry.businessId !== state.businessId) throw new Error("INVALID_STATE: Credit ownership requires reconciliation");
      if (!page.isDone) {
        if (!page.continueCursor || page.continueCursor === state.cursor || state.pendingPaymentId) throw new Error("INVALID_STATE: Credit allocation cursor requires reconciliation");
        await ctx.db.patch(state._id, { cursor: page.continueCursor, updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, advanceRef, { customerId });
        return null;
      }
      const account = await ctx.db.query("creditAccounts").withIndex("by_customerId", q => q.eq("customerId", customerId)).unique();
      if (state.pendingPaymentId || state.outstandingCents !== customer.totalCreditUsedCents || (account && (account.businessId !== state.businessId || account.balanceCents !== state.outstandingCents))) throw new Error("INVALID_STATE: Credit history requires reconciliation");
      await ctx.db.patch(state._id, { status: "ready", updatedAt: Date.now() });
      return null;
    }
    if (entry.businessId !== state.businessId || !Number.isSafeInteger(entry.deltaCents) || !Number.isSafeInteger(entry.balanceAfterCents) || entry.balanceAfterCents < 0) throw new Error("INVALID_STATE: Credit entry requires reconciliation");
    if (state.pendingPaymentId && state.pendingPaymentId !== entry._id) throw new Error("INVALID_STATE: Credit allocation cursor requires reconciliation");
    if (!state.pendingPaymentId && state.outstandingCents + entry.deltaCents !== entry.balanceAfterCents) throw new Error("INVALID_STATE: Credit history requires reconciliation");
    let outstanding = state.outstandingCents;
    let remaining = state.pendingPaymentCents ?? -entry.deltaCents;
    if (entry.kind === "payment") {
      if (entry.deltaCents >= 0 || !Number.isSafeInteger(remaining) || remaining <= 0 || remaining > outstanding || outstanding - remaining !== entry.balanceAfterCents) throw new Error("INVALID_STATE: Invalid payment allocation");
      const debts = await ctx.db.query("creditDebts").withIndex("by_customerId_and_status", q => q.eq("customerId", customerId).eq("status", "open")).order("asc").take(64);
      if (!debts.length || debts.some(debt => debt.businessId !== state.businessId || !Number.isSafeInteger(debt.remainingCents) || !Number.isSafeInteger(debt.principalCents) || debt.remainingCents <= 0 || debt.remainingCents > debt.principalCents)) throw new Error("INVALID_STATE: Outstanding debt requires reconciliation");
      for (const debt of debts) {
        if (remaining === 0) break;
        const amountCents = Math.min(debt.remainingCents, remaining);
        await ctx.db.insert("creditPaymentAllocations", { businessId: state.businessId, customerId, paymentEntryId: entry._id, debtEntryId: debt.entryId, amountCents, policy: "fifo_creation_v1", createdAt: entry.createdAt });
        await ctx.db.patch(debt._id, { remainingCents: debt.remainingCents - amountCents, status: debt.remainingCents === amountCents ? "paid" : "open" });
        remaining -= amountCents; outstanding -= amountCents;
      }
      if (remaining > 0) {
        await ctx.db.patch(state._id, { outstandingCents: outstanding, pendingPaymentId: entry._id, pendingPaymentCents: remaining, updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, advanceRef, { customerId });
        return null;
      }
    } else {
      if (entry.deltaCents < 0) throw new Error("INVALID_STATE: Invalid debt direction");
      creditDueAt(entry.dueAt);
      if (entry.deltaCents > 0) await ctx.db.insert("creditDebts", { businessId: state.businessId, customerId, entryId: entry._id, principalCents: entry.deltaCents, remainingCents: entry.deltaCents, dueAt: entry.dueAt, unreconciled: entry.openingSource !== undefined, status: "open", createdAt: entry.createdAt });
      outstanding += entry.deltaCents;
    }
    if (outstanding !== entry.balanceAfterCents) throw new Error("INVALID_STATE: Allocated balance requires reconciliation");
    await ctx.db.patch(state._id, { cursor: page.isDone ? state.cursor : page.continueCursor, outstandingCents: outstanding, pendingPaymentId: undefined, pendingPaymentCents: undefined, lastEntryId: entry._id, lastPaymentAt: entry.kind === "payment" ? entry.createdAt : state.lastPaymentAt, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, advanceRef, { customerId });
    return null;
  },
});

const debtRow = v.object({ entryId: v.id("creditEntries"), remainingCents: v.number(), dueAt: v.optional(v.number()), bucket: v.union(v.literal("current"), v.literal("1_7"), v.literal("8_14"), v.literal("15_30"), v.literal("31_plus"), v.literal("undated"), v.literal("unreconciled")) });
export const agingPage = query({
  args: { customerId: v.id("customers"), asOfDate: v.number(), paginationOpts: paginationOptsValidator },
  returns: v.object({ status: v.union(v.literal("pending"), v.literal("ready")), balanceCents: v.number(), revision: v.optional(v.id("creditEntries")), lastPaymentAt: v.optional(v.number()), page: v.array(debtRow), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    creditDueAt(args.asOfDate);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId) throw new Error("NOT_FOUND: Customer is unavailable");
    const state = await ctx.db.query("creditAllocationState").withIndex("by_customerId", q => q.eq("customerId", args.customerId)).unique();
    const account = await ctx.db.query("creditAccounts").withIndex("by_customerId", q => q.eq("customerId", args.customerId)).unique();
    if (!state || state.businessId !== auth.businessId || state.status !== "ready" || state.outstandingCents !== customer.totalCreditUsedCents || (account && (account.businessId !== auth.businessId || account.balanceCents !== state.outstandingCents))) return { status: "pending" as const, balanceCents: customer.totalCreditUsedCents, page: [], isDone: false, continueCursor: "" };
    const page = await ctx.db.query("creditDebts").withIndex("by_customerId_and_status", q => q.eq("customerId", args.customerId).eq("status", "open")).paginate({ ...args.paginationOpts, numItems: Math.max(1, Math.min(100, args.paginationOpts.numItems)) });
    if (page.page.some(debt => debt.businessId !== auth.businessId)) throw new Error("INVALID_STATE: Debt ownership requires reconciliation");
    return { status: "ready" as const, balanceCents: state.outstandingCents, revision: state.lastEntryId, lastPaymentAt: state.lastPaymentAt, isDone: page.isDone, continueCursor: page.continueCursor, page: page.page.map(debt => {
      const days = debt.dueAt === undefined ? 0 : (args.asOfDate - debt.dueAt) / 86_400_000;
      const bucket = debt.unreconciled ? "unreconciled" as const : debt.dueAt === undefined ? "undated" as const : days <= 0 ? "current" as const : days <= 7 ? "1_7" as const : days <= 14 ? "8_14" as const : days <= 30 ? "15_30" as const : "31_plus" as const;
      return { entryId: debt.entryId, remainingCents: debt.remainingCents, dueAt: debt.dueAt, bucket };
    }) };
  },
});
