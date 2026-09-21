import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { loadPrivacyPolicy } from "./helpers/businessPreferences";

const summary = v.object({ business_id: v.string(), deleted: v.number(), ephemeral_deleted: v.number(), retention_deleted: v.number(), skipped_due_balance: v.number(), queued_count: v.number(), retention_days: v.number() });

export const run = mutation({
  args: { businessId: v.string(), expectedUserId: v.string() }, returns: v.array(summary),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    const policy = await loadPrivacyPolicy(ctx, auth.businessId); const retention = policy.protocol.retention; const ephemeral = policy.protocol.ephemeral_profiles;
    const now = Date.now(); const rows = await ctx.db.query("customers").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).take(5001);
    if (rows.length > 5000) throw new Error("CAPACITY_EXCEEDED: Privacy cleanup needs a larger projection");
    let ephemeralDeleted = 0, retentionDeleted = 0, skipped = 0;
    const candidates = rows.filter(row => (ephemeral.enabled && row.ephemeral === true && (row.ephemeralExpiresAt ?? Infinity) <= now) || (retention.enabled && retention.hard_delete && retention.days > 0 && row.ephemeral !== true && (row.lastActivityAt ?? row.updatedAt ?? row.createdAt) <= now - retention.days * 86400000));
    for (const customer of candidates) {
      if (customer.totalCreditUsedCents > 0) { skipped += 1; continue; }
      const sales = await ctx.db.query("sales").withIndex("by_customerId", q => q.eq("customerId", customer._id)).take(1);
      const entries = await ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customer._id)).take(1);
      if (sales.length || entries.length) { skipped += 1; continue; }
      await ctx.db.delete(customer._id); if (customer.ephemeral) ephemeralDeleted += 1; else retentionDeleted += 1;
      await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "privacy_customer_deleted", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ reason: customer.ephemeral ? "ephemeral_expired" : "retention_cutoff" }), timestamp: now });
    }
    const total = ephemeralDeleted + retentionDeleted;
    if (total || skipped) {
      const nextProtocol = { ...policy.protocol, retention: { ...retention, last_run_at: new Date(now).toISOString() } };
      await ctx.db.patch(policy._id, { protocol: nextProtocol, revision: policy.revision + 1, updatedAt: now, updatedBy: auth.userId });
    }
    return [{ business_id: args.businessId, deleted: total, ephemeral_deleted: ephemeralDeleted, retention_deleted: retentionDeleted, skipped_due_balance: skipped, queued_count: 0, retention_days: retention.days }];
  },
});
