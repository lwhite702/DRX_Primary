import { nextCreditPolicyRevision } from "./helpers/creditPolicyRevision";
import { v, type Infer } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { creditRequestKey } from "./helpers/creditLedger";

const resultValidator = v.object({ customerId: v.id("customers"), creditEnabled: v.boolean(), limitCents: v.number(), unlimited: v.boolean(), balanceCents: v.number() });
const changeArgs = { businessId: v.string(), expectedUserId: v.string(), customerId: v.string(), creditEnabled: v.boolean(), limitCents: v.number(), expectedCreditEnabled: v.boolean(), expectedLimitCents: v.number(), requestKey: v.string() };
type PolicyIntent = { [Key in keyof typeof changeArgs]: Infer<(typeof changeArgs)[Key]> };
function policyFingerprint(customerId: Id<"customers">, args: PolicyIntent) {
  return JSON.stringify([customerId, args.creditEnabled, args.limitCents, args.expectedCreditEnabled, args.expectedLimitCents]);
}
function policyReceipt(prior: Doc<"idempotencyKeys">, customerId: Id<"customers">, args: PolicyIntent) {
  if (prior.action !== "credit_policy" && prior.action !== "credit_policy_cancelled") throw new Error("IDEMPOTENCY_CONFLICT: Request key belongs to another operation");
  let saved: { fingerprint: string; status?: string; customerId?: string; result: Infer<typeof resultValidator> };
  try { saved = JSON.parse(prior.resultJson); } catch { throw new Error("INVALID_STATE: Credit policy receipt requires reconciliation"); }
  if (!saved || typeof saved.fingerprint !== "string") throw new Error("INVALID_STATE: Credit policy receipt requires reconciliation");
  if (saved.fingerprint !== policyFingerprint(customerId, args)) throw new Error("IDEMPOTENCY_CONFLICT: Credit policy request changed");
  if (prior.action === "credit_policy_cancelled") {
    if (saved.status !== "cancelled" || saved.customerId !== customerId || saved.result !== undefined) throw new Error("INVALID_STATE: Credit policy cancellation requires reconciliation");
    return { status: "cancelled" as const, customerId };
  }
  const result = saved.result;
  if (!result || result.customerId !== customerId || result.creditEnabled !== args.creditEnabled || result.limitCents !== args.limitCents || result.unlimited !== (args.creditEnabled && args.limitCents === 0)) throw new Error("INVALID_STATE: Credit policy receipt requires reconciliation");
  validCents(result.balanceCents, "INVALID_STATE");
  return { status: "recorded" as const, result };
}
function validCents(value: number, code: "INVALID_ARGUMENT" | "INVALID_STATE") {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${code}: Credit amounts must be nonnegative integer cents`);
}
async function resolveCustomer(ctx: QueryCtx, businessId: Id<"businesses">, value: string) {
  const id = ctx.db.normalizeId("customers", value);
  const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", businessId).eq("legacyPrismaId", value)).unique();
  if (!customer || customer.businessId !== businessId) throw new Error("NOT_FOUND: Customer is unavailable");
  return customer;
}
function project(customer: Doc<"customers">) {
  validCents(customer.creditLimitCents, "INVALID_STATE"); validCents(customer.totalCreditUsedCents, "INVALID_STATE");
  const enabled = customer.creditEnabled !== false;
  return { customerId: customer._id, creditEnabled: enabled, limitCents: customer.creditLimitCents, unlimited: enabled && customer.creditLimitCents === 0, balanceCents: customer.totalCreditUsedCents };
}
/** Authorizes a policy attempt without preventing immutable archived receipts. */
export const resolveScope = query({
  args: { businessId: v.string(), expectedUserId: v.string(), customerId: v.string() },
  returns: v.object({ businessId: v.id("businesses"), customerId: v.id("customers") }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    const customer = await resolveCustomer(ctx, auth.businessId, args.customerId);
    return { businessId: auth.businessId, customerId: customer._id };
  },
});
export const read = query({
  args: { businessId: v.string(), expectedUserId: v.string(), customerId: v.string() },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    const customer = await resolveCustomer(ctx, auth.businessId, args.customerId);
    if (!customer.isActive) throw new Error("NOT_FOUND: Customer is unavailable");
    return project(customer);
  },
});
export const change = mutation({
  args: changeArgs,
  returns: resultValidator,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    validCents(args.limitCents, "INVALID_ARGUMENT"); validCents(args.expectedLimitCents, "INVALID_ARGUMENT");
    creditRequestKey(args.requestKey);
    const customer = await resolveCustomer(ctx, auth.businessId, args.customerId);
    const key = `credit-policy:${JSON.stringify([auth.userId, args.requestKey])}`;
    const fingerprint = policyFingerprint(customer._id, args);
    const prior = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (prior) {
      const receipt = policyReceipt(prior, customer._id, args);
      if (receipt.status === "cancelled") throw new Error("REQUEST_CANCELLED: Credit policy request was cancelled");
      // Preserve the original receipt even after a later policy change or archive.
      return receipt.result;
    }
    if (!customer.isActive) throw new Error("NOT_FOUND: Customer is unavailable");
    const previous = project(customer);
    if (previous.creditEnabled !== args.expectedCreditEnabled || previous.limitCents !== args.expectedLimitCents) throw new Error("STALE_POLICY: Credit policy changed. Refresh before applying a new change");
    const now = Date.now();
    await ctx.db.patch(customer._id, { creditEnabled: args.creditEnabled, creditLimitCents: args.limitCents, creditPolicyRevision: nextCreditPolicyRevision(customer.creditPolicyRevision), updatedAt: now });
    const result = { customerId: customer._id, creditEnabled: args.creditEnabled, limitCents: args.limitCents, unlimited: args.creditEnabled && args.limitCents === 0, balanceCents: previous.balanceCents };
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_CREDIT_POLICY_CHANGED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ previousEnabled: previous.creditEnabled, previousLimitCents: previous.limitCents, enabled: args.creditEnabled, limitCents: args.limitCents }), timestamp: now });
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "credit_policy", resultJson: JSON.stringify({ fingerprint, result }), createdAt: now });
    return result;
  },
});

/** Atomically resolves a lost response or prevents an unrecorded policy request from executing. */
export const cancel = mutation({
  args: changeArgs,
  returns: v.union(v.object({ status: v.literal("recorded"), result: resultValidator, requestKey: v.string() }), v.object({ status: v.literal("cancelled"), customerId: v.id("customers"), requestKey: v.string() })),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    validCents(args.limitCents, "INVALID_ARGUMENT"); validCents(args.expectedLimitCents, "INVALID_ARGUMENT"); creditRequestKey(args.requestKey);
    const customer = await resolveCustomer(ctx, auth.businessId, args.customerId);
    const key = `credit-policy:${JSON.stringify([auth.userId, args.requestKey])}`;
    const prior = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (prior) return { ...policyReceipt(prior, customer._id, args), requestKey: args.requestKey };
    const now = Date.now(), fingerprint = policyFingerprint(customer._id, args);
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "credit_policy_cancelled", resultJson: JSON.stringify({ fingerprint, status: "cancelled", customerId: customer._id }), createdAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_CREDIT_REQUEST_CANCELLED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ operation: "credit_policy" }), timestamp: now });
    return { status: "cancelled" as const, customerId: customer._id, requestKey: args.requestKey };
  },
});
