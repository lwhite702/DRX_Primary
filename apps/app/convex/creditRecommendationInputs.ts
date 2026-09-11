import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { creditDueAt } from "./helpers/creditLedger";

const MAX_ROWS = 2048;
const DAY = 86_400_000;
function cents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_STATE: Invalid monetary history");
  return value;
}
function add(left: number, right: number) { return cents(left + right); }
function timestamp(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || !Number.isFinite(new Date(value).getTime())) throw new Error("INVALID_STATE: Invalid history date");
  return value;
}

export const inputsValidator = v.object({
  customerId: v.id("customers"), businessId: v.id("businesses"), asOfDate: v.number(), observedAt: v.number(),
  metricVersion: v.literal("canonical_facts_v1"),
  coverage: v.union(v.literal("historical_reconciliation_required"), v.literal("allocation_pending"), v.literal("canonical")),
  ledgerRevision: v.union(v.id("creditEntries"), v.null()),
  policy: v.object({ revision: v.number(), creditEnabled: v.boolean(), limitCents: v.number(), balanceCents: v.number() }),
  credit: v.object({ issuedCents: v.number(), issued30dCents: v.number(), issued90dCents: v.number(), repaidCents: v.number(), issueCount: v.number(), creditSaleCount: v.number() }),
  sales: v.object({ salesCents: v.number(), sales30dCents: v.number(), sales90dCents: v.number(), completedSaleCount: v.number(), firstSaleAt: v.union(v.number(), v.null()), latestSaleAt: v.union(v.number(), v.null()) }),
  inventory: v.object({ valuation: v.literal("catalog_cost"), catalogCostCents: v.number(), catalogSellingCents: v.number(), productCount: v.number(), lowStockProductCount: v.number() }),
  repaymentTiming: v.literal("not_evaluated"),
});

type InputsArgs = { businessId: string; expectedUserId: string; customerId: string; asOfDate: number };

/** Canonical facts only. Authorization is current; an internal snapshot freezes rolling windows. */
export async function readCreditRecommendationInputs(ctx: QueryCtx, args: InputsArgs, options: { snapshotAt?: number } = {}) {
  const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
  requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
  requirePermission(auth.userRecord, "VIEW_FINANCIALS");
  creditDueAt(args.asOfDate);
  const actualNow = Date.now();
  const now = options.snapshotAt ?? actualNow;
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(new Date(now).getTime()) || now > actualNow) throw new Error("INVALID_ARGUMENT: Invalid recommendation snapshot date");
  if (args.asOfDate !== Math.floor(now / DAY) * DAY || Math.floor(now / DAY) !== Math.floor(actualNow / DAY)) throw new Error(options.snapshotAt === undefined ? "INVALID_ARGUMENT: Use the current UTC date" : "INVALID_ARGUMENT: Use the snapshot UTC date");
  const id = ctx.db.normalizeId("customers", args.customerId);
  const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.customerId)).unique();
  if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer unavailable");
  const balanceCents = cents(customer.totalCreditUsedCents), limitCents = cents(customer.creditLimitCents);
  const policyRevision = cents(customer.creditPolicyRevision ?? 0);
  const entries = await ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customer._id)).order("asc").take(MAX_ROWS + 1);
  const sales = await ctx.db.query("sales").withIndex("by_customerId", q => q.eq("customerId", customer._id)).take(MAX_ROWS + 1);
  const products = await ctx.db.query("products").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).take(MAX_ROWS + 1);
  if ([entries, sales, products].some(rows => rows.length > MAX_ROWS)) throw new Error("CAPACITY_EXCEEDED: Recommendation inputs need a larger history projection");
  const account = await ctx.db.query("creditAccounts").withIndex("by_customerId", q => q.eq("customerId", customer._id)).unique();
  const state = await ctx.db.query("creditAllocationState").withIndex("by_customerId", q => q.eq("customerId", customer._id)).unique();
  if ((account && account.businessId !== auth.businessId) || (state && state.businessId !== auth.businessId)) throw new Error("INVALID_STATE: Invalid credit ownership");
  if (account) cents(account.balanceCents);
  if (state) { cents(state.outstandingCents); if (state.pendingPaymentCents !== undefined) cents(state.pendingPaymentCents); }
  let issuedCents = 0, issued30dCents = 0, issued90dCents = 0, repaidCents = 0, issueCount = 0, creditSaleCount = 0, running = 0;
  let hasOpeningHistory = false;
  for (const entry of entries) {
    if (entry.businessId !== auth.businessId) throw new Error("INVALID_STATE: Invalid credit ownership");
    timestamp(entry.createdAt); creditDueAt(entry.dueAt); cents(entry.balanceAfterCents);
    if (entry.createdAt > now || !Number.isSafeInteger(entry.deltaCents)) throw new Error("INVALID_STATE: Invalid credit history");
    if (entry.kind === "payment" ? entry.deltaCents >= 0 : entry.kind === "opening" ? entry.deltaCents < 0 : entry.deltaCents <= 0) throw new Error("INVALID_STATE: Invalid credit direction");
    running = add(running, entry.deltaCents);
    if (running !== entry.balanceAfterCents) throw new Error("INVALID_STATE: Credit history requires reconciliation");
    if (entry.kind === "opening") { hasOpeningHistory ||= entry.deltaCents > 0 || entry.openingSource !== undefined; }
    else if (entry.kind === "payment") repaidCents = add(repaidCents, -entry.deltaCents);
    else {
      issuedCents = add(issuedCents, entry.deltaCents);
      if (entry.createdAt >= now - 30 * DAY) issued30dCents = add(issued30dCents, entry.deltaCents);
      if (entry.createdAt >= now - 90 * DAY) issued90dCents = add(issued90dCents, entry.deltaCents);
      if (entry.kind === "issue") issueCount++; else creditSaleCount++;
    }
  }
  if (running !== balanceCents || (account && account.balanceCents !== balanceCents) || (entries.length > 0 && !account)) throw new Error("INVALID_STATE: Credit history requires reconciliation");
  let salesCents = 0, sales30dCents = 0, sales90dCents = 0, completedSaleCount = 0;
  let firstSaleAt: number | null = null, latestSaleAt: number | null = null;
  for (const sale of sales) {
    if (sale.businessId !== auth.businessId) throw new Error("INVALID_STATE: Invalid sale ownership");
    if (["pending", "cancelled", "refunded"].includes(sale.orderStatus)) continue;
    if (sale.orderStatus !== "completed") throw new Error("INVALID_STATE: Unknown sale status");
    const at = timestamp(sale.occurredAt ?? sale.createdAt);
    if (at > now) throw new Error("INVALID_STATE: Invalid sale date");
    salesCents = add(salesCents, cents(sale.totalAmountCents)); completedSaleCount++;
    if (at >= now - 30 * DAY) sales30dCents = add(sales30dCents, sale.totalAmountCents);
    if (at >= now - 90 * DAY) sales90dCents = add(sales90dCents, sale.totalAmountCents);
    firstSaleAt = Math.min(firstSaleAt ?? at, at); latestSaleAt = Math.max(latestSaleAt ?? at, at);
  }
  // Catalog cost valuation, not historical FIFO cost. Fractional stock remains precise.
  let catalogCostCents = 0, catalogSellingCents = 0, lowStockProductCount = 0;
  for (const product of products) {
    const quantity = product.quantityOnHandGrams;
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error("INVALID_STATE: Invalid stock quantity");
    const cost = cents(product.unitCostCents) * quantity, selling = cents(product.sellingPriceCents) * quantity;
    if (cost > Number.MAX_SAFE_INTEGER - catalogCostCents || selling > Number.MAX_SAFE_INTEGER - catalogSellingCents) throw new Error("INVALID_STATE: Inventory valuation exceeds supported precision");
    catalogCostCents += cost;
    catalogSellingCents += selling;
    if (!Number.isFinite(catalogCostCents) || catalogCostCents > Number.MAX_SAFE_INTEGER || !Number.isFinite(catalogSellingCents) || catalogSellingCents > Number.MAX_SAFE_INTEGER) throw new Error("INVALID_STATE: Inventory valuation exceeds supported precision");
    if (quantity < 10) lowStockProductCount++;
  }
  const allocationReady = state?.status === "ready" && state.outstandingCents === balanceCents && !state.pendingPaymentId && state.pendingPaymentCents === undefined && state.lastEntryId === entries.at(-1)?._id;
  const coverage = hasOpeningHistory || customer.legacyPrismaId !== undefined ? "historical_reconciliation_required" as const : !allocationReady ? "allocation_pending" as const : "canonical" as const;
  return {
    customerId: customer._id, businessId: auth.businessId, asOfDate: args.asOfDate, observedAt: now,
    metricVersion: "canonical_facts_v1" as const, coverage, ledgerRevision: entries.at(-1)?._id ?? null,
    policy: { revision: policyRevision, creditEnabled: customer.creditEnabled !== false, limitCents, balanceCents },
    credit: { issuedCents, issued30dCents, issued90dCents, repaidCents, issueCount, creditSaleCount },
    sales: { salesCents, sales30dCents, sales90dCents, completedSaleCount, firstSaleAt, latestSaleAt },
    inventory: { valuation: "catalog_cost" as const, catalogCostCents, catalogSellingCents, productCount: products.length, lowStockProductCount },
    // Historical payment punctuality needs due-date/allocation evidence; absence is not perfect repayment.
    repaymentTiming: "not_evaluated" as const,
  };
}

export type CreditRecommendationInputs = Awaited<ReturnType<typeof readCreditRecommendationInputs>>;

export const read = query({
  args: { businessId: v.string(), expectedUserId: v.string(), customerId: v.string(), asOfDate: v.number() },
  returns: inputsValidator,
  handler: (ctx, args) => readCreditRecommendationInputs(ctx, args),
});
