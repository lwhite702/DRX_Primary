import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { loadPrivacyPolicy } from "./helpers/businessPreferences";

const counts = v.object({ alias_count: v.number(), phone_count: v.number(), email_count: v.number(), address_count: v.number(), notes_count: v.number() });
const snapshot = v.object({ id: v.string(), business_id: v.string(), captured_at: v.string(), alias_count: v.number(), phone_count: v.number(), email_count: v.number(), address_count: v.number(), notes_count: v.number(), alias_delta: v.number(), phone_delta: v.number(), email_delta: v.number(), address_delta: v.number(), notes_delta: v.number() });

async function countFields(ctx: any, businessId: any) {
  const rows = await ctx.db.query("customers").withIndex("by_businessId", (q: any) => q.eq("businessId", businessId)).take(5001);
  if (rows.length > 5000) throw new Error("CAPACITY_EXCEEDED: Privacy inventory needs a larger projection");
  const present = (encrypted: unknown, plain: unknown) => encrypted != null || plain != null;
  return {
    alias_count: rows.filter((row: any) => present(row.aliasEncrypted, row.alias)).length,
    phone_count: rows.filter((row: any) => present(row.phoneEncrypted, row.phoneNumber)).length,
    email_count: rows.filter((row: any) => present(row.emailEncrypted, row.email)).length,
    address_count: rows.filter((row: any) => present(row.addressEncrypted, row.address) || row.city != null || row.state != null || row.zipCode != null).length,
    notes_count: rows.filter((row: any) => present(row.notesEncrypted, row.notes)).length,
  };
}

function project(row: any, businessId: string) {
  return { id: row._id, business_id: businessId, captured_at: new Date(row.capturedAt).toISOString(), alias_count: row.aliasCount, phone_count: row.phoneCount, email_count: row.emailCount, address_count: row.addressCount, notes_count: row.notesCount, alias_delta: row.aliasDelta, phone_delta: row.phoneDelta, email_delta: row.emailDelta, address_delta: row.addressDelta, notes_delta: row.notesDelta };
}

export const getLatest = query({
  args: { businessId: v.string(), expectedUserId: v.optional(v.string()) }, returns: v.union(snapshot, v.null()),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "VIEW_CUSTOMERS");
    const row = await ctx.db.query("privacyInventorySnapshots").withIndex("by_businessId_and_capturedAt", q => q.eq("businessId", auth.businessId)).order("desc").first();
    return row ? project(row, args.businessId) : null;
  },
});

export const getCurrent = query({
  args: { businessId: v.string(), expectedUserId: v.optional(v.string()) }, returns: counts,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "VIEW_CUSTOMERS");
    return countFields(ctx, auth.businessId);
  },
});

export const capture = mutation({
  args: { businessId: v.string(), expectedUserId: v.optional(v.string()) }, returns: snapshot,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    const [current, previous, policy] = await Promise.all([
      countFields(ctx, auth.businessId),
      ctx.db.query("privacyInventorySnapshots").withIndex("by_businessId_and_capturedAt", q => q.eq("businessId", auth.businessId)).order("desc").first(),
      loadPrivacyPolicy(ctx, auth.businessId),
    ]);
    const now = Date.now();
    const row = await ctx.db.insert("privacyInventorySnapshots", {
      businessId: auth.businessId, aliasCount: current.alias_count, phoneCount: current.phone_count, emailCount: current.email_count, addressCount: current.address_count, notesCount: current.notes_count,
      aliasDelta: current.alias_count - (previous?.aliasCount ?? 0), phoneDelta: current.phone_count - (previous?.phoneCount ?? 0), emailDelta: current.email_count - (previous?.emailCount ?? 0), addressDelta: current.address_count - (previous?.addressCount ?? 0), notesDelta: current.notes_count - (previous?.notesCount ?? 0), capturedAt: now,
    });
    const protocol = { ...policy.protocol, inventory_monitoring: { ...policy.protocol.inventory_monitoring, last_snapshot_at: new Date(now).toISOString() } };
    await ctx.db.patch(policy._id, { protocol, updatedAt: now, updatedBy: auth.userId });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "privacy_inventory_snapshot_captured", entityType: "privacy_inventory", entityId: row, metadata: JSON.stringify({ capturedAt: now }), timestamp: now });
    return project({ _id: row, ...await ctx.db.get(row) }, args.businessId);
  },
});
