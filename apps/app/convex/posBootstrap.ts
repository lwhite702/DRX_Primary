import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";
import { productRecord } from "./products";

async function access(ctx: QueryCtx, businessId: string) {
  const auth = await requireUserAndBusiness(ctx);
  requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
  if (businessId !== auth.businessId && businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
  return auth;
}

// Read historical sales in bounded pages. A cutover/backfill can later replace
// this with reconciled counters; partial counters must not masquerade as lifetime totals.
const historyLine = v.object({ productId: v.id("products"), quantity: v.number() });

export const salesPage = query({
  args: { businessId: v.string(), through: v.number(), paginationOpts: paginationOptsValidator },
  returns: v.object({ groups: v.array(v.object({ saleId: v.id("sales"), lines: v.array(historyLine), needsPaging: v.boolean() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    if (!Number.isSafeInteger(args.through) || args.through < 0) throw new Error("INVALID_ARGUMENT: Invalid history boundary");
    const page = await ctx.db.query("sales").withIndex("by_businessId_and_orderStatus_and_createdAt", q => q.eq("businessId", auth.businessId).eq("orderStatus", "completed").lte("createdAt", args.through)).order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(25, Math.max(1, args.paginationOpts.numItems)) });
    const groups: Array<{ saleId: Id<"sales">; lines: Array<{ productId: Id<"products">; quantity: number }>; needsPaging: boolean }> = [];
    for (const sale of page.page) {
      const items = await ctx.db.query("salesLineItems").withIndex("by_saleId", q => q.eq("saleId", sale._id)).order("desc").take(51);
      if (items.length > 50) { groups.push({ saleId: sale._id, lines: [], needsPaging: true }); continue; }
      const lines: Array<{ productId: Id<"products">; quantity: number }> = [];
      for (const item of items) {
        if (!item.productId) continue;
        if (!Number.isFinite(item.quantityGrams) || item.quantityGrams <= 0) throw new Error("INVALID_STATE: Invalid historical sale quantity");
        lines.push({ productId: item.productId, quantity: item.quantityGrams });
      }
      groups.push({ saleId: sale._id, lines, needsPaging: false });
    }
    return { groups, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});

export const catalog = query({
  args: { businessId: v.string(), productIds: v.array(v.id("products")) },
  returns: v.array(productRecord),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    if (args.productIds.length > 100) throw new Error("INVALID_ARGUMENT: Too many catalog records");
    const records = await Promise.all(args.productIds.map(id => ctx.db.get(id)));
    return records.filter(product => product && product.businessId === auth.businessId && product.isActive).map(product => ({ ...product!, ...normalizeProductCommerceConfig(product!) }));
  },
});

export const policies = query({
  args: { businessId: v.string() },
  returns: v.object({ creditPolicy: v.object({ enabled: v.boolean() }), deliveryPolicy: v.object({ feeTaxable: v.boolean(), dispatchSlaMinutes: v.number() }), cardFeePolicy: v.optional(v.object({ enabled: v.boolean(), feeType: v.union(v.literal("percent"), v.literal("flat")), feeBps: v.number(), feeFlatCents: v.number() })) }),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    const [settings, enabledCustomer, legacyCustomer] = await Promise.all([
      ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique(),
      ctx.db.query("customers").withIndex("by_businessId_and_isActive_and_creditEnabled", q => q.eq("businessId", auth.businessId).eq("isActive", true).eq("creditEnabled", true)).first(),
      ctx.db.query("customers").withIndex("by_businessId_and_isActive_and_creditEnabled", q => q.eq("businessId", auth.businessId).eq("isActive", true).eq("creditEnabled", undefined)).first(),
    ]);
    // Missing flags preserve existing canonical behavior. Disabled credit must
    // never become unlimited merely because its monetary limit is zero.
    return {
      creditPolicy: { enabled: Boolean(enabledCustomer || legacyCustomer) },
      deliveryPolicy: { feeTaxable: settings?.deliveryFeeTaxable ?? false, dispatchSlaMinutes: settings?.deliveryDispatchSlaMinutes ?? 5 },
      cardFeePolicy: {
        enabled: settings?.cardProcessorFeeEnabled ?? false,
        feeType: settings?.cardProcessorFeeType ?? "percent",
        feeBps: settings?.cardProcessorFeeBps ?? 350,
        feeFlatCents: settings?.cardProcessorFeeFlatCents ?? 0,
      },
    };
  },
});

// Large imported orders retain every line without exceeding a query's read budget.
export const saleLinesPage = query({
  args: { businessId: v.string(), saleId: v.id("sales"), paginationOpts: paginationOptsValidator },
  returns: v.object({ lines: v.array(historyLine), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    const sale = await ctx.db.get(args.saleId);
    if (!sale || sale.businessId !== auth.businessId || sale.orderStatus !== "completed") throw new Error("NOT_FOUND: Sale is unavailable");
    const page = await ctx.db.query("salesLineItems").withIndex("by_saleId", q => q.eq("saleId", sale._id)).order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(200, Math.max(1, args.paginationOpts.numItems)) });
    const lines = page.page.flatMap(item => {
      if (!item.productId) return [];
      if (!Number.isFinite(item.quantityGrams) || item.quantityGrams <= 0) throw new Error("INVALID_STATE: Invalid historical sale quantity");
      return [{ productId: item.productId, quantity: item.quantityGrams }];
    });
    return { lines, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
