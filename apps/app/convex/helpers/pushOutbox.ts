import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export type DeliveryPushKind =
  | "dispatch_overdue"
  | "eta_warning"
  | "eta_due"
  | "overdue"
  | "manager_escalation"
  | "assignment_handoff";

export async function enqueueDeliveryPush(
  ctx: MutationCtx,
  input: {
    businessId: Id<"businesses">;
    notificationId: Id<"deliveryNotifications">;
    deliveryId: Id<"deliveries">;
    targetUserId: string;
    kind: DeliveryPushKind;
    scheduledFor: number;
  },
): Promise<number> {
  const deviceTokens = await ctx.db
    .query("devicePushTokens")
    .withIndex("by_businessId_and_userId_and_status", (q) =>
      q
        .eq("businessId", input.businessId)
        .eq("userId", input.targetUserId)
        .eq("status", "active"),
    )
    .take(20);
  const now = Date.now();
  for (const deviceToken of deviceTokens) {
    const outboxId = await ctx.db.insert("deliveryPushOutbox", {
      businessId: input.businessId,
      notificationId: input.notificationId,
      deliveryId: input.deliveryId,
      deviceTokenId: deviceToken._id,
      targetUserId: input.targetUserId,
      provider: deviceToken.provider,
      payloadJson: "{}",
      status: "queued",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const payload = {
      type: "delivery_reminder" as const,
      outboxId: String(outboxId),
      notificationId: String(input.notificationId),
      deliveryId: String(input.deliveryId),
      kind: input.kind,
      scheduledFor: input.scheduledFor,
      route: "deliveries" as const,
    };
    await ctx.db.patch(outboxId, { payloadJson: JSON.stringify(payload) });
    await ctx.scheduler.runAfter(0, internal.push.dispatchOutbox, { outboxId });
  }
  return deviceTokens.length;
}

export async function enqueueDeliveryPushCancellation(
  ctx: MutationCtx,
  input: {
    businessId: Id<"businesses">;
    notificationId: Id<"deliveryNotifications">;
    deliveryId: Id<"deliveries">;
    targetUserId: string;
  },
): Promise<number> {
  const deviceTokens = await ctx.db
    .query("devicePushTokens")
    .withIndex("by_businessId_and_userId_and_status", (q) =>
      q
        .eq("businessId", input.businessId)
        .eq("userId", input.targetUserId)
        .eq("status", "active"),
    )
    .take(20);
  const now = Date.now();
  for (const deviceToken of deviceTokens) {
    const outboxId = await ctx.db.insert("deliveryPushOutbox", {
      businessId: input.businessId,
      notificationId: input.notificationId,
      deliveryId: input.deliveryId,
      deviceTokenId: deviceToken._id,
      targetUserId: input.targetUserId,
      provider: deviceToken.provider,
      payloadJson: "{}",
      status: "queued",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(outboxId, {
      payloadJson: JSON.stringify({
        type: "delivery_reminder_canceled",
        outboxId: String(outboxId),
        notificationId: String(input.notificationId),
        deliveryId: String(input.deliveryId),
        reason: "assignment_changed",
        route: "deliveries",
      }),
    });
    await ctx.scheduler.runAfter(0, internal.push.dispatchOutbox, { outboxId });
  }
  return deviceTokens.length;
}
