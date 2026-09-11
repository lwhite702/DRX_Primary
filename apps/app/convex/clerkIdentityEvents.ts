import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const recordOrganization = internalMutation({
  args: { sourceEventId: v.string(), clerkOrgId: v.string(), name: v.string(), createdBy: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("clerkOrganizations").withIndex("by_clerkOrgId", q => q.eq("clerkOrgId", args.clerkOrgId)).unique();
    if (existing) {
      if (existing.createdBy !== args.createdBy) throw new Error("CONFLICT: Organization owner requires reconciliation");
      return "already_recorded";
    }
    await ctx.db.insert("clerkOrganizations", { ...args, receivedAt: Date.now() });
    return "recorded";
  },
});
export const recordSession = internalMutation({
  args: {
    sourceEventId: v.string(), userId: v.string(), sessionId: v.string(),
    eventType: v.union(v.literal("session.created"), v.literal("session.ended"), v.literal("session.removed"), v.literal("session.revoked")),
    occurredAt: v.optional(v.number()), ipAddress: v.optional(v.string()), userAgent: v.optional(v.string()),
    deviceType: v.optional(v.string()), city: v.optional(v.string()), country: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("authSessionEvents").withIndex("by_sourceEventId", q => q.eq("sourceEventId", args.sourceEventId)).unique();
    if (existing) {
      if (existing.userId !== args.userId || existing.sessionId !== args.sessionId || existing.eventType !== args.eventType) throw new Error("CONFLICT: Session event identity mismatch");
      return "already_recorded";
    }
    await ctx.db.insert("authSessionEvents", { ...args, receivedAt: Date.now() });
    return "recorded";
  },
});

export const recordManualRevocation = internalMutation({
  args: { userId: v.string(), sessionId: v.string(), phase: v.union(v.literal("requested"), v.literal("confirmed")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sourceEventId = `manual-revoke:${args.userId}:${args.sessionId}:${args.phase}`;
    const existing = await ctx.db.query("authSessionEvents").withIndex("by_sourceEventId", q => q.eq("sourceEventId", sourceEventId)).unique();
    if (existing) return null;
    await ctx.db.insert("authSessionEvents", { sourceEventId, userId: args.userId, sessionId: args.sessionId, eventType: args.phase === "requested" ? "session.revocation.requested" : "session.revoked.manual", receivedAt: Date.now() });
    return null;
  },
});
