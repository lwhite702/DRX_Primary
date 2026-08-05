import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function logAuditEvent(
  ctx: MutationCtx,
  businessId: Id<"businesses">,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
): Promise<Id<"auditEvents">> {
  return await ctx.db.insert("auditEvents", {
    businessId,
    userId,
    action,
    entityType,
    entityId,
    metadata: JSON.stringify(metadata || {}),
    timestamp: Date.now(),
  });
}
