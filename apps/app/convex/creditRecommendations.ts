import { v, type Infer } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { creditRequestKey } from "./helpers/creditLedger";
import { nextCreditPolicyRevision } from "./helpers/creditPolicyRevision";
import { inputsValidator, readCreditRecommendationInputs, type CreditRecommendationInputs } from "./creditRecommendationInputs";

const scopeArgs = { businessId: v.string(), expectedUserId: v.string() };
const outputFields = { recommendedLimitCents: v.number(), rangeMinCents: v.number(), rangeMaxCents: v.number(), riskScore: v.number(), justification: v.string(), provenance: v.union(v.literal("provider"), v.literal("rules")), engineVersion: v.string() };
const savedValidator = v.object({ recommendationId: v.id("creditRecommendations"), customerId: v.id("customers"), businessId: v.id("businesses"), asOfDate: v.number(), snapshotAt: v.number(), settingsRevision: v.number(), createdAt: v.number(), expiresAt: v.number(), proposedCreditEnabled: v.boolean(), proposedLimitCents: v.number(), policyRevision: v.number(), ...outputFields });
const appliedValidator = v.object({ recommendationId: v.id("creditRecommendations"), customerId: v.id("customers"), creditEnabled: v.boolean(), limitCents: v.number(), unlimited: v.boolean(), balanceCents: v.number(), policyRevision: v.number() });
const applyArgs = { ...scopeArgs, recommendationId: v.id("creditRecommendations"), requestKey: v.string() };
function applicationReceipt(prior: Doc<"idempotencyKeys">, row: Doc<"creditRecommendations">) {
  if (prior.action !== "credit_recommendation_apply" && prior.action !== "credit_recommendation_apply_cancelled") throw new Error("IDEMPOTENCY_CONFLICT: Request belongs to another operation");
  let receipt: { recommendationId: string; status?: string; result: Infer<typeof appliedValidator> };
  try { receipt = JSON.parse(prior.resultJson); } catch { throw new Error("INVALID_STATE: Recommendation receipt requires reconciliation"); }
  if (!receipt || typeof receipt.recommendationId !== "string") throw new Error("INVALID_STATE: Recommendation receipt requires reconciliation");
  if (receipt.recommendationId !== row._id) throw new Error("IDEMPOTENCY_CONFLICT: Recommendation request changed");
  if (prior.action === "credit_recommendation_apply_cancelled") {
    if (receipt.status !== "cancelled" || receipt.result !== undefined) throw new Error("INVALID_STATE: Recommendation cancellation requires reconciliation");
    return { status: "cancelled" as const, recommendationId: row._id };
  }
  const result = receipt.result, proposal = project(row), inputs = snapshot(row);
  if (!result || result.recommendationId !== row._id || result.customerId !== row.customerId || typeof result.creditEnabled !== "boolean" || result.unlimited !== (result.creditEnabled && result.limitCents === 0)) throw new Error("INVALID_STATE: Recommendation receipt requires reconciliation");
  integer(result.limitCents); integer(result.balanceCents); integer(result.policyRevision, 1);
  if (result.limitCents !== proposal.proposedLimitCents || result.creditEnabled !== proposal.proposedCreditEnabled || result.balanceCents !== inputs.policy.balanceCents || result.policyRevision !== nextCreditPolicyRevision(inputs.policy.revision)) throw new Error("INVALID_STATE: Recommendation receipt requires reconciliation");
  return { status: "recorded" as const, result };
}
function integer(value: number, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error("INVALID_STATE: Invalid recommendation amount or revision");
  return value;
}
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
}
async function authorize(ctx: QueryCtx, args: { businessId: string; expectedUserId: string }) {
  const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
  requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
  requirePermission(auth.userRecord, "VIEW_FINANCIALS");
  return auth;
}
async function customerFor(ctx: QueryCtx, businessId: Id<"businesses">, value: string) {
  const id = ctx.db.normalizeId("customers", value);
  const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", businessId).eq("legacyPrismaId", value)).unique();
  if (!customer || customer.businessId !== businessId) throw new Error("NOT_FOUND: Customer unavailable");
  return customer;
}
function validateOutput(value: { recommendedLimitCents: number; rangeMinCents: number; rangeMaxCents: number; riskScore: number; justification: string; engineVersion: string }) {
  integer(value.recommendedLimitCents); integer(value.rangeMinCents); integer(value.rangeMaxCents);
  if (value.rangeMinCents > value.recommendedLimitCents || value.recommendedLimitCents > value.rangeMaxCents || !Number.isFinite(value.riskScore) || value.riskScore < 0 || value.riskScore > 100 || !value.justification.trim() || value.justification.length > 2000 || !/^[a-zA-Z0-9_.-]{1,80}$/.test(value.engineVersion)) throw new Error("INVALID_ARGUMENT: Invalid recommendation output");
}
function snapshot(row: Doc<"creditRecommendations">): CreditRecommendationInputs {
  if (row.inputsJson.length > 16384) throw new Error("INVALID_STATE: Recommendation snapshot exceeds supported size");
  let inputs: CreditRecommendationInputs;
  try { inputs = JSON.parse(row.inputsJson); } catch { throw new Error("INVALID_STATE: Recommendation snapshot requires reconciliation"); }
  if (!inputs || inputs.observedAt !== row.snapshotAt || inputs.asOfDate !== row.asOfDate || inputs.customerId !== row.customerId || inputs.businessId !== row.businessId || inputs.metricVersion !== "canonical_facts_v1" || inputs.repaymentTiming !== "not_evaluated" || !["canonical", "allocation_pending", "historical_reconciliation_required"].includes(inputs.coverage) || !inputs.policy || typeof inputs.policy.creditEnabled !== "boolean") throw new Error("INVALID_STATE: Invalid recommendation snapshot");
  integer(inputs.policy.revision); integer(inputs.policy.limitCents); integer(inputs.policy.balanceCents);
  integer(row.snapshotAt); integer(row.asOfDate); integer(row.createdAt);
  if (row.asOfDate % 86400000 !== 0 || Math.floor(row.snapshotAt / 86400000) * 86400000 !== row.asOfDate || row.createdAt < row.snapshotAt || !Number.isFinite(new Date(row.snapshotAt).getTime())) throw new Error("INVALID_STATE: Invalid recommendation dates");
  return inputs;
}
function project(row: Doc<"creditRecommendations">) {
  validateOutput(row); integer(row.settingsRevision, 1);
  const inputs = snapshot(row);
  const proposedCreditEnabled = row.recommendedLimitCents === 0 ? false : inputs.policy.creditEnabled;
  const proposedLimitCents = row.recommendedLimitCents === 0 ? inputs.policy.limitCents : row.recommendedLimitCents;
  const expiresAt = integer(row.asOfDate + 86400000);
  return { recommendationId: row._id, businessId: row.businessId, customerId: row.customerId, asOfDate: row.asOfDate, snapshotAt: row.snapshotAt, settingsRevision: row.settingsRevision, createdAt: row.createdAt, expiresAt, proposedCreditEnabled, proposedLimitCents, policyRevision: inputs.policy.revision, recommendedLimitCents: row.recommendedLimitCents, rangeMinCents: row.rangeMinCents, rangeMaxCents: row.rangeMaxCents, riskScore: row.riskScore, justification: row.justification, provenance: row.provenance, engineVersion: row.engineVersion };
}
async function settingsFor(ctx: QueryCtx, businessId: Id<"businesses">, revision: number) {
  integer(revision, 1);
  const settings = await ctx.db.query("creditRecommendationSettings").withIndex("by_businessId", q => q.eq("businessId", businessId)).unique();
  if (!settings || !settings.enabled || settings.revision !== revision) throw new Error("STALE_SETTINGS: Recommendation settings changed or are unavailable");
  integer(settings.maxCustomerCents); integer(settings.newCustomerCents); integer(settings.revision, 1); integer(settings.inventoryCapBps); integer(settings.autoRefreshDays, 1); integer(settings.autoRefreshDays * 86400000);
  if (settings.inventoryCapBps > 10000) throw new Error("INVALID_STATE: Invalid inventory cap");
  return settings;
}
function validateCap(row: { recommendedLimitCents: number; rangeMaxCents: number }, inputs: CreditRecommendationInputs, settings: Doc<"creditRecommendationSettings">) {
  const cap = Math.min(settings.maxCustomerCents, Math.floor(inputs.inventory.catalogCostCents * (settings.inventoryCapBps / 10000)));
  integer(cap);
  if (row.recommendedLimitCents > cap || row.rangeMaxCents > cap) throw new Error("INVALID_ARGUMENT: Recommendation exceeds configured caps");
}
async function checkSnapshot(ctx: QueryCtx, args: { businessId: string; expectedUserId: string; customerId: string }, inputs: CreditRecommendationInputs) {
  const current = await readCreditRecommendationInputs(ctx, { ...args, asOfDate: inputs.asOfDate }, { snapshotAt: inputs.observedAt });
  if (current.coverage !== "canonical") throw new Error("INSUFFICIENT_HISTORY: Recommendation requires reconciled canonical history");
  if (stable(current) !== stable(inputs)) throw new Error("STALE_RECOMMENDATION: Recommendation inputs changed");
}
async function priorResult(ctx: QueryCtx, businessId: Id<"businesses">, userId: string, customerId: Id<"customers">, requestKey: string) {
  creditRequestKey(requestKey);
  const saved = await ctx.db.query("creditRecommendations").withIndex("by_businessId_and_requestedBy_and_requestKey", q => q.eq("businessId", businessId).eq("requestedBy", userId).eq("requestKey", requestKey)).unique();
  if (saved && saved.customerId !== customerId) throw new Error("IDEMPOTENCY_CONFLICT: Recommendation request customer changed");
  return saved ? project(saved) : null;
}
/** First-result identity is actor + request key + customer, not a retry's fresh provider output. */
export const requestResult = internalQuery({
  args: { ...scopeArgs, customerId: v.string(), requestKey: v.string() }, returns: v.union(v.null(), savedValidator),
  handler: async (ctx, args) => {
    const auth = await authorize(ctx, args); const customer = await customerFor(ctx, auth.businessId, args.customerId);
    return priorResult(ctx, auth.businessId, auth.userId, customer._id, args.requestKey);
  },
});
/** Only a trusted generation action can record output; clients cannot forge this mutation. */
export const recordGenerated = internalMutation({
  args: { ...scopeArgs, customerId: v.string(), requestKey: v.string(), inputs: inputsValidator, settingsRevision: v.number(), ...outputFields }, returns: savedValidator,
  handler: async (ctx, args) => {
    const auth = await authorize(ctx, args); const customer = await customerFor(ctx, auth.businessId, args.customerId);
    const prior = await priorResult(ctx, auth.businessId, auth.userId, customer._id, args.requestKey);
    if (prior) return prior;
    validateOutput(args);
    const settings = await settingsFor(ctx, auth.businessId, args.settingsRevision);
    await checkSnapshot(ctx, args, args.inputs); validateCap(args, args.inputs, settings);
    if (stable(args.inputs).length > 16384) throw new Error("INVALID_ARGUMENT: Recommendation snapshot exceeds supported size");
    const id = await ctx.db.insert("creditRecommendations", { businessId: auth.businessId, customerId: customer._id, requestedBy: auth.userId, requestKey: args.requestKey, snapshotAt: args.inputs.observedAt, asOfDate: args.inputs.asOfDate, inputsJson: stable(args.inputs), settingsRevision: args.settingsRevision, recommendedLimitCents: args.recommendedLimitCents, rangeMinCents: args.rangeMinCents, rangeMaxCents: args.rangeMaxCents, riskScore: args.riskScore, justification: args.justification, provenance: args.provenance, engineVersion: args.engineVersion, createdAt: Date.now() });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CREDIT_RECOMMENDATION_GENERATED", entityType: "credit_recommendation", entityId: id, metadata: JSON.stringify({ settingsRevision: args.settingsRevision, provenance: args.provenance, engineVersion: args.engineVersion }), timestamp: Date.now() });
    return project((await ctx.db.get(id))!);
  },
});
export const get = query({
  args: { ...scopeArgs, recommendationId: v.id("creditRecommendations") }, returns: savedValidator,
  handler: async (ctx, args) => {
    const auth = await authorize(ctx, args); const row = await ctx.db.get(args.recommendationId);
    if (!row || row.businessId !== auth.businessId) throw new Error("NOT_FOUND: Recommendation unavailable");
    await customerFor(ctx, auth.businessId, row.customerId); return project(row);
  },
});
export const latest = query({
  args: { ...scopeArgs, customerId: v.string() }, returns: v.union(v.null(), savedValidator),
  handler: async (ctx, args) => {
    const auth = await authorize(ctx, args); const customer = await customerFor(ctx, auth.businessId, args.customerId);
    const row = await ctx.db.query("creditRecommendations").withIndex("by_businessId_and_customerId", q => q.eq("businessId", auth.businessId).eq("customerId", customer._id)).order("desc").first();
    return row ? project(row) : null;
  },
});
export const apply = mutation({
  args: applyArgs, returns: appliedValidator,
  handler: async (ctx, args) => {
    const auth = await authorize(ctx, args); creditRequestKey(args.requestKey);
    const row = await ctx.db.get(args.recommendationId);
    if (!row || row.businessId !== auth.businessId) throw new Error("NOT_FOUND: Recommendation unavailable");
    const customer = await customerFor(ctx, auth.businessId, row.customerId);
    const key = `credit-recommendation-apply:${JSON.stringify([auth.userId, args.requestKey])}`;
    const prior = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (prior) {
      const receipt = applicationReceipt(prior, row);
      if (receipt.status === "cancelled") throw new Error("REQUEST_CANCELLED: Recommendation application was cancelled");
      return receipt.result;
    }
    const proposal = project(row), inputs = snapshot(row);
    if (Date.now() >= proposal.expiresAt) throw new Error("STALE_RECOMMENDATION: Recommendation expired. Generate a new recommendation");
    const settings = await settingsFor(ctx, auth.businessId, row.settingsRevision);
    await checkSnapshot(ctx, { ...args, customerId: customer._id }, inputs); validateCap(row, inputs, settings);
    const creditEnabled = row.recommendedLimitCents === 0 ? false : customer.creditEnabled !== false;
    const limitCents = row.recommendedLimitCents === 0 ? customer.creditLimitCents : row.recommendedLimitCents;
    const policyRevision = nextCreditPolicyRevision(customer.creditPolicyRevision), now = Date.now();
    await ctx.db.patch(customer._id, { creditEnabled, creditLimitCents: limitCents, creditPolicyRevision: policyRevision, updatedAt: now });
    const result = { recommendationId: row._id, customerId: customer._id, creditEnabled, limitCents, unlimited: creditEnabled && limitCents === 0, balanceCents: customer.totalCreditUsedCents, policyRevision };
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_CREDIT_POLICY_CHANGED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ recommendationId: row._id, previousEnabled: customer.creditEnabled !== false, previousLimitCents: customer.creditLimitCents, creditEnabled, limitCents, policyRevision }), timestamp: now });
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "credit_recommendation_apply", resultJson: JSON.stringify({ recommendationId: row._id, result }), createdAt: now });
    return result;
  },
});

/** Cancellation and application share a key, so serializable mutation ordering decides the winner. */
export const cancelApply = mutation({
  args: applyArgs,
  returns: v.union(v.object({ status: v.literal("recorded"), result: appliedValidator, requestKey: v.string() }), v.object({ status: v.literal("cancelled"), recommendationId: v.id("creditRecommendations"), requestKey: v.string() })),
  handler: async (ctx, args) => {
    const auth = await authorize(ctx, args); creditRequestKey(args.requestKey);
    const row = await ctx.db.get(args.recommendationId);
    if (!row || row.businessId !== auth.businessId) throw new Error("NOT_FOUND: Recommendation unavailable");
    const customer = await customerFor(ctx, auth.businessId, row.customerId);
    const key = `credit-recommendation-apply:${JSON.stringify([auth.userId, args.requestKey])}`;
    const prior = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (prior) return { ...applicationReceipt(prior, row), requestKey: args.requestKey };
    const now = Date.now();
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "credit_recommendation_apply_cancelled", resultJson: JSON.stringify({ recommendationId: row._id, status: "cancelled" }), createdAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_CREDIT_REQUEST_CANCELLED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ operation: "credit_recommendation_apply", recommendationId: row._id }), timestamp: now });
    return { status: "cancelled" as const, recommendationId: row._id, requestKey: args.requestKey };
  },
});
