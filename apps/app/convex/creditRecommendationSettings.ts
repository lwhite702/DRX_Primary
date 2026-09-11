import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { creditRequestKey } from "./helpers/creditLedger";

const settingsFields = { enabled: v.boolean(), maxCustomerCents: v.number(), inventoryCapBps: v.number(), newCustomerCents: v.number(), autoRefreshDays: v.number() };
const resultValidator = v.object({ businessId: v.id("businesses"), ...settingsFields, revision: v.number() });
type Settings = { enabled: boolean; maxCustomerCents: number; inventoryCapBps: number; newCustomerCents: number; autoRefreshDays: number };
type Result = Settings & { businessId: Id<"businesses">; revision: number };
function validate(value: Settings, code: "INVALID_ARGUMENT" | "INVALID_STATE") {
  if (typeof value.enabled !== "boolean" || !Number.isSafeInteger(value.maxCustomerCents) || value.maxCustomerCents < 0 || !Number.isSafeInteger(value.newCustomerCents) || value.newCustomerCents < 0 || !Number.isSafeInteger(value.inventoryCapBps) || value.inventoryCapBps < 0 || value.inventoryCapBps > 10000 || !Number.isSafeInteger(value.autoRefreshDays) || value.autoRefreshDays < 1 || !Number.isSafeInteger(value.autoRefreshDays * 86400000)) throw new Error(`${code}: Invalid credit recommendation settings`);
}
function revision(value: number, code: "INVALID_ARGUMENT" | "INVALID_STATE") {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${code}: Invalid credit recommendation settings revision`);
}
function project(value: Result): Result {
  validate(value, "INVALID_STATE"); revision(value.revision, "INVALID_STATE");
  return { businessId: value.businessId, enabled: value.enabled, maxCustomerCents: value.maxCustomerCents, inventoryCapBps: value.inventoryCapBps, newCustomerCents: value.newCustomerCents, autoRefreshDays: value.autoRefreshDays, revision: value.revision };
}
export const read = query({
  args: { businessId: v.string(), expectedUserId: v.string() }, returns: v.union(v.null(), resultValidator),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    const saved = await ctx.db.query("creditRecommendationSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    return saved ? project(saved) : null;
  },
});
export const save = mutation({
  args: { businessId: v.string(), expectedUserId: v.string(), ...settingsFields, expectedRevision: v.union(v.number(), v.null()), requestKey: v.string() }, returns: resultValidator,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    validate(args, "INVALID_ARGUMENT");
    if (args.expectedRevision !== null) revision(args.expectedRevision, "INVALID_ARGUMENT");
    creditRequestKey(args.requestKey);
    const fields: Settings = { enabled: args.enabled, maxCustomerCents: args.maxCustomerCents, inventoryCapBps: args.inventoryCapBps, newCustomerCents: args.newCustomerCents, autoRefreshDays: args.autoRefreshDays };
    const fingerprint = JSON.stringify([fields.enabled, fields.maxCustomerCents, fields.inventoryCapBps, fields.newCustomerCents, fields.autoRefreshDays, args.expectedRevision]);
    const key = `credit-recommendation-settings:${JSON.stringify([auth.userId, args.requestKey])}`;
    const prior = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (prior) {
      if (prior.action !== "credit_recommendation_settings") throw new Error("IDEMPOTENCY_CONFLICT: Request belongs to another operation");
      let saved: { fingerprint: string; result: Result };
      try { saved = JSON.parse(prior.resultJson); } catch { throw new Error("INVALID_STATE: Settings receipt requires reconciliation"); }
      if (!saved || saved.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_CONFLICT: Credit recommendation settings request changed");
      if (!saved.result || saved.result.businessId !== auth.businessId) throw new Error("INVALID_STATE: Settings receipt requires reconciliation");
      const result = project(saved.result);
      if (result.enabled !== fields.enabled || result.maxCustomerCents !== fields.maxCustomerCents || result.inventoryCapBps !== fields.inventoryCapBps || result.newCustomerCents !== fields.newCustomerCents || result.autoRefreshDays !== fields.autoRefreshDays || result.revision !== (args.expectedRevision ?? 0) + 1) throw new Error("INVALID_STATE: Settings receipt requires reconciliation");
      return result;
    }
    const existing = await ctx.db.query("creditRecommendationSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    if (existing) project(existing);
    if ((existing?.revision ?? null) !== args.expectedRevision) throw new Error("STALE_SETTINGS: Credit recommendation settings changed. Refresh before saving");
    const nextRevision = (existing?.revision ?? 0) + 1;
    revision(nextRevision, "INVALID_STATE");
    const now = Date.now();
    if (existing) await ctx.db.patch(existing._id, { ...fields, revision: nextRevision, updatedAt: now, updatedBy: auth.userId });
    else await ctx.db.insert("creditRecommendationSettings", { businessId: auth.businessId, ...fields, revision: nextRevision, createdAt: now, updatedAt: now, updatedBy: auth.userId });
    const result = { businessId: auth.businessId, ...fields, revision: nextRevision };
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CREDIT_RECOMMENDATION_SETTINGS_CHANGED", entityType: "credit_recommendation_settings", entityId: auth.businessId, metadata: JSON.stringify({ previousRevision: existing?.revision ?? null, revision: nextRevision, ...fields }), timestamp: now });
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "credit_recommendation_settings", resultJson: JSON.stringify({ fingerprint, result }), createdAt: now });
    return result;
  },
});
