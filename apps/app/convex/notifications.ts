import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { requireNotificationRecipient } from "./helpers/notificationRecipient";
import { query, mutation, action, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Doc } from "./_generated/dataModel";
async function actor(ctx: QueryCtx | MutationCtx, expectedUserId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
  if (identity.subject !== expectedUserId) throw new Error("FORBIDDEN: Operator changed");
  return identity.subject;
}
async function findNotification(ctx: QueryCtx | MutationCtx, value: string) {
  const id = ctx.db.normalizeId("notifications", value);
  if (id) return ctx.db.get(id);
  return ctx.db.query("notifications").withIndex("by_legacyId", q => q.eq("legacyId", value)).unique();
}
const dto = (row: Doc<"notifications">) => ({ id: row._id, userId: row.userId, title: row.title, message: row.message, type: row.type, link: row.link ?? null, isRead: row.isRead, createdAt: new Date(row.createdAt).toISOString() });
export const unread = query({
  args: { expectedUserId: v.string() },
  returns: v.array(v.object({ id: v.id("notifications"), userId: v.string(), title: v.string(), message: v.string(), type: v.string(), link: v.union(v.string(), v.null()), isRead: v.boolean(), createdAt: v.string() })),
  handler: async (ctx, args) => {
    const userId = await actor(ctx, args.expectedUserId);
    const rows = await ctx.db.query("notifications").withIndex("by_userId_and_state", q => q.eq("userId", userId).eq("isDeleted", false).eq("isRead", false)).order("desc").take(100);
    return rows.map(dto);
  },
});
export const markRead = mutation({
  args: { expectedUserId: v.string(), notificationId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await actor(ctx, args.expectedUserId), row = await findNotification(ctx, args.notificationId);
    if (!row || row.userId !== userId) throw new Error("NOT_FOUND: Notification unavailable");
    if (row.isRead || row.isDeleted) return null;
    await ctx.db.patch(row._id, { isRead: true });
    await ctx.db.insert("notificationEvents", { businessId: row.businessId, notificationId: row._id, actorId: userId, recipientId: userId, eventType: "read", createdAt: Date.now() });
    return null;
  },
});
export const markReadPage = mutation({
  args: { expectedUserId: v.string(), through: v.number() }, returns: v.object({ processed: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await actor(ctx, args.expectedUserId);
    if (!Number.isSafeInteger(args.through) || args.through < 0 || args.through > Date.now()) throw new Error("INVALID_ARGUMENT: Invalid read cutoff");
    const rows = await ctx.db.query("notifications").withIndex("by_userId_and_state", q => q.eq("userId", userId).eq("isDeleted", false).eq("isRead", false).lte("createdAt", args.through)).take(201);
    const page = rows.slice(0, 200), now = Date.now();
    for (const row of page) {
      await ctx.db.patch(row._id, { isRead: true });
      await ctx.db.insert("notificationEvents", { businessId: row.businessId, notificationId: row._id, actorId: userId, recipientId: userId, eventType: "read", createdAt: now });
    }
    return { processed: page.length, hasMore: rows.length > 200 };
  },
});
export const remove = mutation({
  args: { expectedUserId: v.string(), notificationId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await actor(ctx, args.expectedUserId), row = await findNotification(ctx, args.notificationId);
    if (!row) {
      const id = ctx.db.normalizeId("notifications", args.notificationId);
      const previous = id
        ? await ctx.db.query("notificationDeletions").withIndex("by_notificationId", q => q.eq("notificationId", id)).unique()
        : await ctx.db.query("notificationDeletions").withIndex("by_legacyId", q => q.eq("legacyId", args.notificationId)).unique();
      if (previous?.recipientId === userId) return null;
      throw new Error("NOT_FOUND: Notification unavailable");
    }
    if (row.userId !== userId) throw new Error("NOT_FOUND: Notification unavailable");
    const now = Date.now();
    await ctx.db.delete(row._id);
    await ctx.db.insert("notificationDeletions", { notificationId: row._id, recipientId: userId, legacyId: row.legacyId, deletedAt: now });
    await ctx.db.insert("notificationEvents", { businessId: row.businessId, notificationId: row._id, actorId: userId, recipientId: userId, eventType: "deleted", createdAt: now });
    return null;
  },
});
export const markAllRead = action({
  args: { expectedUserId: v.string() },
  returns: v.object({ processed: v.number(), through: v.number() }),
  handler: async (ctx, args): Promise<{ processed: number; through: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
    if (identity.subject !== args.expectedUserId) throw new Error("FORBIDDEN: Operator changed");
    const through = Date.now(); let processed = 0;
    for (;;) {
      const result: FunctionReturnType<typeof api.notifications.markReadPage> = await ctx.runMutation(api.notifications.markReadPage, { ...args, through });
      processed += result.processed;
      if (!result.hasMore) return { processed, through };
      if (!result.processed) throw new Error("INVALID_STATE: Notification read progress could not be confirmed");
    }
  },
});
export const createAlert = internalMutation({
  args: { expectedUserId: v.string(), targetUserId: v.string(), requestId: v.string(), fingerprint: v.string(), type: v.string(), message: v.string(), metadataJson: v.optional(v.string()) },
  returns: v.object({ notificationId: v.id("notifications"), userId: v.string(), message: v.string() }),
  handler: async (ctx, args) => {
    const businessId = await requireNotificationRecipient(ctx, args.expectedUserId, args.targetUserId);
    const previous = await ctx.db.query("notificationCreationReceipts").withIndex("by_actorId_and_requestId", q => q.eq("actorId", args.expectedUserId).eq("requestId", args.requestId)).unique();
    if (previous) {
      if (previous.businessId !== businessId || previous.fingerprint !== args.fingerprint || previous.recipientId !== args.targetUserId) throw new Error("CONFLICT: Alert retry differs");
      return { notificationId: previous.notificationId, userId: previous.recipientId, message: args.message };
    }
    const now = Date.now();
    const notificationId = await ctx.db.insert("notifications", { businessId, userId: args.targetUserId, title: "Alert", message: args.message, type: args.type, metadataJson: args.metadataJson, isRead: false, isDeleted: false, createdAt: now });
    await ctx.db.insert("notificationCreationReceipts", { businessId, actorId: args.expectedUserId, recipientId: args.targetUserId, requestId: args.requestId, fingerprint: args.fingerprint, notificationId, createdAt: now });
    await ctx.db.insert("notificationEvents", { businessId, notificationId, actorId: args.expectedUserId, recipientId: args.targetUserId, eventType: "created", createdAt: now });
    return { notificationId, userId: args.targetUserId, message: args.message };
  },
});

export const auditLogs = query({
  args: { expectedUserId: v.string(), limit: v.number() },
  returns: v.array(v.object({ id: v.id("notificationEvents"), businessId: v.id("businesses"), entityId: v.id("notifications"), entityType: v.literal("notification"), action: v.string(), createdAt: v.string() })),
  handler: async (ctx, args) => {
    await actor(ctx, args.expectedUserId);
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_AUDIT_LOGS");
    if (!Number.isSafeInteger(args.limit) || args.limit < 1 || args.limit > 500) throw new Error("INVALID_ARGUMENT: Invalid limit");
    const rows = await ctx.db.query("notificationEvents").withIndex("by_businessId_and_createdAt", q => q.eq("businessId", auth.businessId)).order("desc").take(args.limit);
    return rows.map(row => ({ id: row._id, businessId: auth.businessId, entityId: row.notificationId, entityType: "notification" as const, action: row.eventType, createdAt: new Date(row.createdAt).toISOString() }));
  },
});
