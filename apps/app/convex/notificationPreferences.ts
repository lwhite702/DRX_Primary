import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireNotificationRecipient } from "./helpers/notificationRecipient";
function validatePreferences(json: string) {
  if (new TextEncoder().encode(json).length > 16384) throw new Error("INVALID_ARGUMENT: Preferences exceed size limit");
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error("INVALID_ARGUMENT: Invalid preferences"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_ARGUMENT: Preferences must be an object");
  const pending: Array<{ value: unknown; depth: number }> = [{ value: parsed, depth: 0 }];
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (depth > 32 || (typeof value === "number" && !Number.isFinite(value))) throw new Error("INVALID_ARGUMENT: Invalid preference value");
    if (value && typeof value === "object") for (const item of Object.values(value)) pending.push({ value: item, depth: depth + 1 });
  }
  return JSON.stringify(parsed);
}
export const get = query({
  args: { expectedUserId: v.string(), targetUserId: v.string() },
  returns: v.union(v.null(), v.object({ userId: v.string(), preferencesJson: v.string(), revision: v.number() })),
  handler: async (ctx, args) => {
    await requireNotificationRecipient(ctx, args.expectedUserId, args.targetUserId);
    const row = await ctx.db.query("notificationPreferences").withIndex("by_userId", q => q.eq("userId", args.targetUserId)).unique();
    return row ? { userId: row.userId, preferencesJson: row.preferencesJson, revision: row.revision } : null;
  },
});
// Only an internal, gated action may call this writer. It is not a public gate bypass.
export const save = internalMutation({
  args: { expectedUserId: v.string(), preferencesJson: v.string(), expectedRevision: v.optional(v.number()) },
  returns: v.object({ userId: v.string(), preferencesJson: v.string(), revision: v.number() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
    if (identity.subject !== args.expectedUserId) throw new Error("FORBIDDEN: Operator changed");
    const preferencesJson = validatePreferences(args.preferencesJson);
    const existing = await ctx.db.query("notificationPreferences").withIndex("by_userId", q => q.eq("userId", identity.subject)).unique();
    const revision = existing?.revision ?? 0;
    if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) throw new Error("INVALID_STATE: Preferences revision requires reconciliation");
    if (args.expectedRevision !== undefined && args.expectedRevision !== revision) throw new Error("CONFLICT: Preferences changed");
    if (existing?.preferencesJson === preferencesJson) return { userId: identity.subject, preferencesJson, revision };
    const now = Date.now(), next = revision + 1;
    if (existing) await ctx.db.patch(existing._id, { preferencesJson, revision: next, updatedAt: now });
    else await ctx.db.insert("notificationPreferences", { userId: identity.subject, preferencesJson, revision: next, createdAt: now, updatedAt: now });
    return { userId: identity.subject, preferencesJson, revision: next };
  },
});
