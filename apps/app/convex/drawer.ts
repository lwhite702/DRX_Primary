import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
export const record = mutation({
  args: { businessId: v.string(), expectedUserId: v.string(), requestId: v.string(), eventType: v.union(v.literal("no_sale"), v.literal("cash_drop"), v.literal("payout"), v.literal("audit"), v.literal("refund")), note: v.string() },
  returns: v.object({ success: v.literal(true), event_id: v.id("drawerEvents") }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.requestId) || args.note.length > 500) throw new Error("INVALID_ARGUMENT: Invalid drawer event");
    const existing = await ctx.db.query("drawerEvents").withIndex("by_businessId_and_requestId", q => q.eq("businessId", auth.businessId).eq("requestId", args.requestId)).unique();
    if (existing) {
      if (existing.userId !== auth.userId || existing.eventType !== args.eventType || existing.note !== args.note) throw new Error("CONFLICT: Drawer event retry differs");
      return { success: true as const, event_id: existing._id };
    }
    const event_id = await ctx.db.insert("drawerEvents", { businessId: auth.businessId, userId: auth.userId, requestId: args.requestId, eventType: args.eventType, note: args.note, createdAt: Date.now() });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "drawer_event", entityType: "drawer_event", entityId: event_id, metadata: JSON.stringify({ eventType: args.eventType }), timestamp: Date.now() });
    return { success: true as const, event_id };
  },
});
