import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const args = { identifierHash: v.string(), ipHash: v.string() };
const state = v.object({ failedCount: v.number(), windowStartedAt: v.number(), lockedUntil: v.union(v.number(), v.null()) });

export const get = query({ args, returns: v.union(state, v.null()), handler: async (ctx, input) => {
  const row = await ctx.db.query("authLockoutWindows").withIndex("by_identifierHash_and_ipHash", q => q.eq("identifierHash", input.identifierHash).eq("ipHash", input.ipHash)).unique();
  return row ? { failedCount: row.failedCount, windowStartedAt: row.windowStartedAt, lockedUntil: row.lockedUntil ?? null } : null;
} });

export const resetExpired = mutation({ args, returns: v.null(), handler: async (ctx, input) => {
  const row = await ctx.db.query("authLockoutWindows").withIndex("by_identifierHash_and_ipHash", q => q.eq("identifierHash", input.identifierHash).eq("ipHash", input.ipHash)).unique();
  if (row) await ctx.db.patch(row._id, { failedCount: 0, windowStartedAt: Date.now(), lockedUntil: undefined });
  return null;
} });

export const recordFailure = mutation({ args: { ...args, maxAttempts: v.number(), durationMs: v.number() }, returns: state, handler: async (ctx, input) => {
  const row = await ctx.db.query("authLockoutWindows").withIndex("by_identifierHash_and_ipHash", q => q.eq("identifierHash", input.identifierHash).eq("ipHash", input.ipHash)).unique();
  const now = Date.now();
  const expired = !row || now - row.windowStartedAt > input.durationMs;
  const failedCount = expired ? 1 : row.failedCount + 1;
  const lockedUntil = failedCount >= input.maxAttempts ? now + input.durationMs : undefined;
  if (row) await ctx.db.patch(row._id, { failedCount, windowStartedAt: expired ? now : row.windowStartedAt, lockedUntil });
  else await ctx.db.insert("authLockoutWindows", { identifierHash: input.identifierHash, ipHash: input.ipHash, failedCount, windowStartedAt: now, lockedUntil });
  return { failedCount, windowStartedAt: expired ? now : row!.windowStartedAt, lockedUntil: lockedUntil ?? null };
} });

export const clear = mutation({ args, returns: v.null(), handler: async (ctx, input) => {
  const row = await ctx.db.query("authLockoutWindows").withIndex("by_identifierHash_and_ipHash", q => q.eq("identifierHash", input.identifierHash).eq("ipHash", input.ipHash)).unique();
  if (row) await ctx.db.delete(row._id);
  return null;
} });
