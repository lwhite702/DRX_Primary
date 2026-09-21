import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const listForBusiness = query({
  args: { businessId: v.string(), limit: v.number(), before: v.optional(v.number()), resourceType: v.optional(v.string()), resourceId: v.optional(v.string()) },
  returns: v.array(v.object({ id: v.string(), userId: v.string(), action: v.string(), entityType: v.string(), entityId: v.string(), metadata: v.string(), timestamp: v.number() })),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx); requirePermission(auth.userRecord, "VIEW_AUDIT_LOGS");
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
    const limit = Math.min(Math.max(Math.floor(args.limit), 1), 100);
    let rows = await ctx.db.query("auditEvents").withIndex("by_businessId_and_timestamp", q => q.eq("businessId", auth.businessId).lt("timestamp", args.before ?? Date.now() + 1)).order("desc").take(limit);
    if (args.resourceType) rows = rows.filter(row => row.entityType === args.resourceType && (!args.resourceId || row.entityId === args.resourceId));
    return rows.map(row => ({ id: row._id, userId: row.userId, action: row.action, entityType: row.entityType, entityId: row.entityId, metadata: row.metadata, timestamp: row.timestamp }));
  },
});

export const logPrivacySecurityEvent = mutation({
  args: {
    businessId: v.string(),
    customerId: v.union(v.string(), v.null()),
    action: v.union(
      v.literal("privacy_vault_decrypt_failed"),
      v.literal("privacy_vault_key_unavailable"),
      v.literal("privacy_vault_invalid_payload"),
    ),
    field: v.union(v.string(), v.null()),
    details: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error("FORBIDDEN: Business context changed");
    }
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: args.action,
      entityType: "privacy",
      entityId: args.customerId ?? "privacy",
      metadata: JSON.stringify({ field: args.field, ...JSON.parse(args.details) }),
      timestamp: Date.now(),
    });
    return null;
  },
});
