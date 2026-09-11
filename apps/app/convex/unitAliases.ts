import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
const context = { businessId: v.string(), expectedUserId: v.string() };
export const list = query({
  args: { ...context, paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.id("productUnitAliases"), alias_name: v.string(), standard_unit: v.union(v.literal("g"), v.literal("oz")), quantity: v.number(), is_enabled: v.boolean(), is_system_default: v.boolean() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const result = await ctx.db.query("productUnitAliases").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { isDone: result.isDone, continueCursor: result.continueCursor, page: result.page.filter(row => !row.removed).map(row => ({ id: row._id, alias_name: row.name, standard_unit: row.standardUnit, quantity: row.quantity, is_enabled: row.enabled, is_system_default: row.systemDefault })) };
  },
});
export const create = mutation({
  args: { ...context, name: v.string(), standardUnit: v.union(v.literal("g"), v.literal("oz")), quantity: v.number() }, returns: v.id("productUnitAliases"),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const name = args.name.trim(), normalizedName = name.toLowerCase();
    if (!name || name.length > 100 || !Number.isFinite(args.quantity) || args.quantity <= 0) throw new Error("INVALID_ARGUMENT: Invalid unit alias");
    const existing = await ctx.db.query("productUnitAliases").withIndex("by_businessId_and_normalizedName", q => q.eq("businessId", auth.businessId).eq("normalizedName", normalizedName)).filter(q => q.or(q.eq(q.field("removed"), false), q.eq(q.field("systemDefault"), true))).first();
    if (existing) throw new Error("ALREADY_EXISTS: Alias name already exists");
    const now = Date.now();
    const id = await ctx.db.insert("productUnitAliases", { businessId: auth.businessId, name, normalizedName, standardUnit: args.standardUnit, quantity: args.quantity, enabled: true, systemDefault: false, removed: false, createdAt: now, updatedAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "create_unit_alias", entityType: "unit_alias", entityId: id, metadata: JSON.stringify({ standardUnit: args.standardUnit, quantity: args.quantity }), timestamp: now });
    return id;
  },
});
export const update = mutation({
  args: { ...context, id: v.id("productUnitAliases"), enabled: v.optional(v.boolean()), remove: v.optional(v.boolean()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const row = await ctx.db.get(args.id);
    if (!row || row.businessId !== auth.businessId) throw new Error("NOT_FOUND: Alias not found");
    if (args.remove !== true && args.enabled === undefined) throw new Error("INVALID_ARGUMENT: Missing alias change");
    const enabled = args.remove ? false : args.enabled!, removed = args.remove ? true : row.removed;
    if (row.removed && !args.remove) throw new Error("NOT_FOUND: Alias was removed");
    if (row.enabled === enabled && row.removed === removed) return null;
    await ctx.db.patch(row._id, { enabled, removed, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: args.remove ? "remove_unit_alias" : "toggle_unit_alias", entityType: "unit_alias", entityId: row._id, metadata: JSON.stringify({ enabled, removed }), timestamp: Date.now() });
    return null;
  },
});

export const restoreSavedDefaults = mutation({
  args: { ...context, paginationOpts: paginationOptsValidator },
  returns: v.object({ restored: v.number(), found: v.number(), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const result = await ctx.db.query("productUnitAliases").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    let restored = 0, found = 0;
    for (const row of result.page) {
      if (!row.systemDefault) continue;
      found++;
      if (row.enabled && !row.removed) continue;
      await ctx.db.patch(row._id, { enabled: true, removed: false, updatedAt: Date.now() }); restored++;
      await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "restore_unit_alias", entityType: "unit_alias", entityId: row._id, metadata: "{}", timestamp: Date.now() });
    }
    return { restored, found, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
