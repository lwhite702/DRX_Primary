import { dashboardPreferences, dashboardPreset } from "./validators/dashboard";
import { ALL_PINNED_ITEM_IDS, getDefaultPinnedItemsForPreset } from "../lib/auth/dashboard-preferences";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { configuredPin, loadPrivacyPolicy, preferencesSnapshot, saveBusinessPreferences } from "./helpers/businessPreferences";
import { privacyProtocolValidator } from "./validators/privacy";

const context = { businessId: v.string(), expectedUserId: v.optional(v.string()) };
const snapshot = v.object({ collectTax: v.boolean(), taxRateBps: v.number(), hasPinConfigured: v.boolean(), privacyProtocol: v.union(privacyProtocolValidator, v.null()), privacyRevision: v.union(v.number(), v.null()) });
export const getSettings = query({
  args: { ...context, includePrivacy: v.optional(v.boolean()) }, returns: snapshot,
  handler: async (ctx, args) => preferencesSnapshot(ctx, await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId), args.includePrivacy),
});
export const saveSettings = mutation({
  args: { ...context, includePrivacy: v.optional(v.boolean()), collectTax: v.optional(v.boolean()), taxRateBps: v.optional(v.number()), posManagerPin: v.optional(v.union(v.string(), v.null())), privacyProtocol: v.optional(privacyProtocolValidator), expectedPrivacyRevision: v.optional(v.number()) }, returns: snapshot,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    await saveBusinessPreferences(ctx, auth, args);
    return preferencesSnapshot(ctx, auth, args.includePrivacy);
  },
});
export const getPrivacyPolicy = query({
  args: context, returns: privacyProtocolValidator,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    return (await loadPrivacyPolicy(ctx, auth.businessId)).protocol;
  },
});
const preference = v.object({ manual_enabled: v.boolean() });
export const getManualPreference = query({
  args: context, returns: v.union(preference, v.null()),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const row = await ctx.db.query("operatorPrivacyPreferences").withIndex("by_businessId_and_clerkUserId", q => q.eq("businessId", auth.businessId).eq("clerkUserId", auth.userId)).unique();
    return row ? { manual_enabled: row.manualScreenPrivacyEnabled } : null;
  },
});
export const setManualPreference = mutation({
  args: { ...context, manualEnabled: v.boolean() }, returns: preference,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const row = await ctx.db.query("operatorPrivacyPreferences").withIndex("by_businessId_and_clerkUserId", q => q.eq("businessId", auth.businessId).eq("clerkUserId", auth.userId)).unique();
    if (row?.manualScreenPrivacyEnabled === args.manualEnabled) return { manual_enabled: args.manualEnabled };
    const now = Date.now();
    const preferenceId = row?._id ?? await ctx.db.insert("operatorPrivacyPreferences", { businessId: auth.businessId, clerkUserId: auth.userId, manualScreenPrivacyEnabled: args.manualEnabled, createdAt: now, updatedAt: now });
    if (row) await ctx.db.patch(row._id, { manualScreenPrivacyEnabled: args.manualEnabled, updatedAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "screen_privacy_preference_updated", entityType: "privacy_preference", entityId: preferenceId, metadata: JSON.stringify({ manual_enabled: args.manualEnabled }), timestamp: now });
    return { manual_enabled: args.manualEnabled };
  },
});
export const verifyExitPin = query({
  args: { ...context, pin: v.optional(v.string()) }, returns: v.object({ allowed: v.boolean(), hasPinConfigured: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    const pin = configuredPin(settings);
    return { allowed: !pin || args.pin?.trim() === pin, hasPinConfigured: Boolean(pin) };
  },
});

export const getDashboardPreferences = query({
  args: context, returns: dashboardPreferences,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    return auth.userRecord.dashboardPreferences ?? { preset: "operations" as const, pinnedItemIds: getDefaultPinnedItemsForPreset("operations"), version: 1 as const };
  },
});
export const updateDashboardPreferences = mutation({
  args: { ...context, preset: v.optional(dashboardPreset), pinnedItemIds: v.optional(v.array(v.string())) },
  returns: dashboardPreferences,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    if (args.pinnedItemIds && (args.pinnedItemIds.length > ALL_PINNED_ITEM_IDS.length || args.pinnedItemIds.some(id => !(ALL_PINNED_ITEM_IDS as string[]).includes(id)) || new Set(args.pinnedItemIds).size !== args.pinnedItemIds.length)) throw new Error("INVALID_ARGUMENT: Invalid dashboard panels");
    const current = auth.userRecord.dashboardPreferences;
    const preset = args.preset ?? current?.preset ?? "operations";
    const pinnedItemIds = args.pinnedItemIds ?? current?.pinnedItemIds ?? getDefaultPinnedItemsForPreset(preset);
    if (current && current.preset === preset && JSON.stringify(current.pinnedItemIds) === JSON.stringify(pinnedItemIds)) return current;
    const next = { preset, pinnedItemIds, version: 1 as const, updatedAt: new Date().toISOString() };
    await ctx.db.patch(auth.userRecord._id, { dashboardPreferences: next, updatedAt: Date.now() });
    return next;
  },
});
