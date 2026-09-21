import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import type { Id } from "./_generated/dataModel";
import { getDefaultPrivacyProtocol } from "../lib/privacy/profiles";

async function requirePlatform(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED: Authentication required");
  const grant = await ctx.db.query("platformAdminGrants").withIndex("by_userId", (q: any) => q.eq("userId", identity.subject)).unique();
  if (!grant?.isActive) throw new Error("FORBIDDEN: Platform administrator access required");
  return identity.subject;
}

export const listBusinesses = query({
  args: {}, returns: v.array(v.object({ id: v.string(), businessName: v.string(), businessType: v.union(v.string(), v.null()), isActive: v.boolean(), createdAt: v.number() })),
  handler: async (ctx) => {
    await requirePlatform(ctx);
    const rows = await ctx.db.query("businesses").take(100);
    return rows.sort((a, b) => b.createdAt - a.createdAt).map(b => ({ id: b.legacyPrismaBusinessId ?? b._id, businessName: b.name, businessType: b.businessType ?? null, isActive: b.isActive !== false, createdAt: b.createdAt }));
  },
});

export const listUsers = query({
  args: {}, returns: v.array(v.object({ id: v.string(), userId: v.string(), role: v.string(), businessName: v.string(), businessId: v.union(v.string(), v.null()), createdAt: v.number() })),
  handler: async (ctx) => {
    await requirePlatform(ctx);
    const rows = await ctx.db.query("users").take(100);
    return Promise.all(rows.sort((a, b) => b.createdAt - a.createdAt).map(async u => {
      const business = await ctx.db.get(u.businessId);
      return { id: u._id, userId: u.clerkUserId, role: u.role, businessName: business?.name ?? "N/A", businessId: business ? (business.legacyPrismaBusinessId ?? business._id) : null, createdAt: u.createdAt };
    }));
  },
});

export const setBusinessActive = mutation({
  args: { businessId: v.string(), active: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requirePlatform(ctx);
    const business = await ctx.db.query("businesses").withIndex("by_legacyPrismaBusinessId", (q: any) => q.eq("legacyPrismaBusinessId", args.businessId)).unique() ?? await ctx.db.get(args.businessId as Id<"businesses">);
    if (!business) throw new Error("NOT_FOUND: Business not found");
    await ctx.db.patch(business._id, { isActive: args.active, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { businessId: business._id, userId, action: "platform_business_status_changed", entityType: "business", entityId: business._id, metadata: JSON.stringify({ isActive: args.active }), timestamp: Date.now() });
    return null;
  },
});

export const updateUserRole = mutation({
  args: { targetUserId: v.string(), businessId: v.string(), role: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await requirePlatform(ctx);
    const business = await ctx.db.query("businesses").withIndex("by_legacyPrismaBusinessId", (q: any) => q.eq("legacyPrismaBusinessId", args.businessId)).unique() ?? await ctx.db.get(args.businessId as Id<"businesses">);
    if (!business) throw new Error("NOT_FOUND: Business not found");
    const member = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", args.targetUserId).eq("businessId", business._id)).unique();
    if (!member || member.role === "OWNER") throw new Error("FORBIDDEN: Membership unavailable");
    await ctx.db.patch(member._id, { role: args.role as any, permissions: member.permissions ?? {}, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { businessId: business._id, userId: actorId, action: "platform_update_business_role", entityType: "user_role", entityId: member._id, metadata: JSON.stringify({ role: args.role }), timestamp: Date.now() });
    return null;
  },
});

export const createBusiness = mutation({
  args: { businessName: v.string(), businessType: v.optional(v.string()), ownerId: v.string(), ownerEmail: v.string(), ownerName: v.optional(v.string()), currency: v.optional(v.string()), timezone: v.optional(v.string()) },
  returns: v.object({ id: v.id("businesses"), businessName: v.string(), businessType: v.union(v.string(), v.null()), ownerId: v.string() }),
  handler: async (ctx, args) => {
    const actorId = await requirePlatform(ctx);
    if (!args.businessName.trim() || !args.ownerId.trim() || !args.ownerEmail.trim()) throw new Error("INVALID_ARGUMENT: Business and owner details are required");
    const duplicate = await ctx.db.query("businesses").withIndex("by_ownerId", q => q.eq("ownerId", args.ownerId)).first();
    if (duplicate) throw new Error("CONFLICT: Owner already has a business");
    const now = Date.now();
    const businessId = await ctx.db.insert("businesses", { name: args.businessName.trim(), businessType: args.businessType?.trim() || undefined, ownerId: args.ownerId, currency: args.currency ?? "USD", timezone: args.timezone ?? "America/New_York", collectTax: false, taxRateBps: 0, isActive: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("users", { clerkUserId: args.ownerId, email: args.ownerEmail.trim().toLowerCase(), name: args.ownerName?.trim() || undefined, role: "OWNER", permissions: { all: true }, businessId, status: "ACTIVE", isDefaultMembership: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("businessSettings", { businessId, settingsData: JSON.stringify({}), createdAt: now, updatedAt: now });
    await ctx.db.insert("businessPrivacyPolicies", { businessId, protocol: getDefaultPrivacyProtocol("standard_mode"), revision: 1, createdAt: now, updatedAt: now, updatedBy: actorId });
    await ctx.db.insert("auditEvents", { businessId, userId: actorId, action: "platform_business_created", entityType: "business", entityId: businessId, metadata: JSON.stringify({ ownerId: args.ownerId }), timestamp: now });
    return { id: businessId, businessName: args.businessName.trim(), businessType: args.businessType?.trim() || null, ownerId: args.ownerId };
  },
});

export const createUserMembership = mutation({
  args: { targetUserId: v.string(), email: v.string(), name: v.optional(v.string()), businessId: v.string(), role: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await requirePlatform(ctx);
    const business = await ctx.db.query("businesses").withIndex("by_legacyPrismaBusinessId", (q: any) => q.eq("legacyPrismaBusinessId", args.businessId)).unique() ?? await ctx.db.get(args.businessId as Id<"businesses">);
    if (!business) throw new Error("NOT_FOUND: Business not found");
    const existing = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", args.targetUserId).eq("businessId", business._id)).unique();
    if (existing) throw new Error("CONFLICT: User is already a member");
    const now = Date.now();
    const memberId = await ctx.db.insert("users", { clerkUserId: args.targetUserId, email: args.email.trim().toLowerCase(), name: args.name?.trim() || undefined, role: args.role, permissions: {}, businessId: business._id, status: "ACTIVE", createdAt: now, updatedAt: now });
    await ctx.db.insert("auditEvents", { businessId: business._id, userId: actorId, action: "platform_user_created", entityType: "user", entityId: memberId, metadata: JSON.stringify({ role: args.role }), timestamp: now });
    return null;
  },
});

export const removeIdentity = mutation({
  args: { targetUserId: v.string(), businessId: v.string(), anonymizedUserId: v.string(), anonymizedEmail: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await requirePlatform(ctx);
    if (!args.targetUserId || args.targetUserId === actorId) throw new Error("INVALID_TARGET: Target is unavailable or protected");
    const targetGrant = await ctx.db.query("platformAdminGrants").withIndex("by_userId", q => q.eq("userId", args.targetUserId)).unique();
    if (targetGrant) throw new Error("PROTECTED_TARGET: Platform accounts cannot be removed here");
    const owned = await ctx.db.query("businesses").withIndex("by_ownerId", q => q.eq("ownerId", args.targetUserId)).first();
    if (owned) throw new Error("OWNER_CONFLICT: Transfer or close every owned business before removing this identity");
    const business = await ctx.db.query("businesses").withIndex("by_legacyPrismaBusinessId", (q: any) => q.eq("legacyPrismaBusinessId", args.businessId)).unique() ?? await ctx.db.get(args.businessId as Id<"businesses">);
    if (!business) throw new Error("INVALID_TARGET: Business is unavailable");
    const member = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", args.targetUserId).eq("businessId", business._id)).unique();
    if (!member) throw new Error("INVALID_TARGET: Business membership is unavailable");
    const now = Date.now();
    await ctx.db.patch(member._id, { clerkUserId: args.anonymizedUserId, email: args.anonymizedEmail, name: "DELETED_USER_RTBF", status: "ARCHIVED", updatedAt: now });
    await ctx.db.insert("auditEvents", { businessId: business._id, userId: actorId, action: "rtbf_completed", entityType: "user", entityId: member._id, metadata: JSON.stringify({ scope: "global_identity" }), timestamp: now });
    return null;
  },
});

export const validateIdentityRemoval = query({
  args: { targetUserId: v.string(), businessId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await requirePlatform(ctx);
    if (!args.targetUserId || args.targetUserId === actorId) throw new Error("INVALID_TARGET: Target is unavailable or protected");
    if (await ctx.db.query("platformAdminGrants").withIndex("by_userId", q => q.eq("userId", args.targetUserId)).unique()) throw new Error("PROTECTED_TARGET: Platform accounts cannot be removed here");
    if (await ctx.db.query("businesses").withIndex("by_ownerId", q => q.eq("ownerId", args.targetUserId)).first()) throw new Error("OWNER_CONFLICT: Transfer or close every owned business before removing this identity");
    const business = await ctx.db.query("businesses").withIndex("by_legacyPrismaBusinessId", (q: any) => q.eq("legacyPrismaBusinessId", args.businessId)).unique() ?? await ctx.db.get(args.businessId as Id<"businesses">);
    if (!business || !(await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", args.targetUserId).eq("businessId", business._id)).unique())) throw new Error("INVALID_TARGET: The selected business membership is unavailable");
    return null;
  },
});
