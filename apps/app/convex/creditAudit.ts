import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

const creditActions = new Set(["CUSTOMER_CREDIT_POLICY_CHANGED", "CUSTOMER_CREDIT_REQUEST_CANCELLED", "CUSTOMER_CREDIT_PAYMENT", "CUSTOMER_CREDIT_SALE", "CUSTOMER_CREDIT_ISSUED"]);
const item = v.object({ id: v.id("auditEvents"), action: v.string(), entity_type: v.literal("customer"), transaction_id: v.null(), performed_by: v.string(), timestamp: v.string() });
function validScope(value: string) {
  if (!value.trim() || value.length > 200) throw new Error("INVALID_ARGUMENT: Invalid credit audit scope");
}

/** Current credit writers audit the customer entity. Legacy audit history is not inferred. */
export const page = query({
  args: { businessId: v.string(), expectedUserId: v.string(), customerId: v.optional(v.string()), accountId: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  returns: v.object({ items: v.array(item), data: v.array(item), count: v.number(), isDone: v.boolean(), continueCursor: v.string(), coverage: v.literal("canonical_customer_credit_events"), legacyHistoryIncluded: v.literal(false) }),
  handler: async (ctx, args) => {
    validScope(args.businessId);
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "VIEW_AUDIT_LOGS");
    if (!args.customerId && !args.accountId) throw new Error("INVALID_ARGUMENT: A customer or credit account is required");
    if (args.customerId !== undefined) validScope(args.customerId);
    if (args.accountId !== undefined) validScope(args.accountId);
    const { numItems, cursor } = args.paginationOpts;
    if (!Number.isInteger(numItems) || numItems < 1 || numItems > 100 || (cursor !== null && (!cursor || cursor.length > 10000))) throw new Error("INVALID_ARGUMENT: Invalid audit pagination");
    const accountId = args.accountId === undefined ? null : ctx.db.normalizeId("creditAccounts", args.accountId);
    const account = accountId ? await ctx.db.get(accountId) : null;
    // Legacy credit-limit IDs are not customer IDs and have no explicit account mapping.
    if (args.accountId !== undefined && (!account || account.businessId !== auth.businessId)) throw new Error("NOT_FOUND: Credit account is unavailable");
    const customerId = args.customerId === undefined ? account!.customerId : ctx.db.normalizeId("customers", args.customerId);
    const customer = customerId ? await ctx.db.get(customerId) : await ctx.db.query("customers")
      .withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.customerId!)).unique();
    if (!customer || customer.businessId !== auth.businessId || (account && account.customerId !== customer._id)) throw new Error("NOT_FOUND: Customer is unavailable");
    const result = await ctx.db.query("auditEvents")
      .withIndex("by_businessId_and_entityType_and_entityId_and_timestamp", q => q.eq("businessId", auth.businessId).eq("entityType", "customer").eq("entityId", customer._id))
      .order("desc").paginate(args.paginationOpts);
    // Filter after bounded pagination so unrelated customer events cannot create an unbounded scan.
    // A sparse/empty page may still have a continuation cursor. Count is this page only.
    const items = result.page.filter(event => creditActions.has(event.action)).map(event => {
      if (!Number.isSafeInteger(event.timestamp) || event.timestamp < 0 || event.timestamp > 8640000000000000) throw new Error("INVALID_STATE: Audit timestamp requires reconciliation");
      return { id: event._id, action: event.action, entity_type: "customer" as const, transaction_id: null, performed_by: event.userId, timestamp: new Date(event.timestamp).toISOString() };
    });
    return { items, data: items, count: items.length, isDone: result.isDone, continueCursor: result.continueCursor, coverage: "canonical_customer_credit_events" as const, legacyHistoryIncluded: false as const };
  },
});
