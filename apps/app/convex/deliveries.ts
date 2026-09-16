import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserAndBusiness } from "./helpers/auth";
import { decryptDeliveryAddress } from "./helpers/deliveryCrypto";
import { requirePermission } from "./helpers/permissions";
import {
  enqueueDeliveryPush,
  enqueueDeliveryPushCancellation,
} from "./helpers/pushOutbox";

const deliveryStatus = v.union(
  v.literal("ready_for_dispatch"),
  v.literal("uber_ordered"),
  v.literal("handed_off"),
  v.literal("delivered"),
  v.literal("canceled"),
);

const reminderKind = v.union(
  v.literal("dispatch_overdue"),
  v.literal("eta_warning"),
  v.literal("eta_due"),
  v.literal("overdue"),
  v.literal("manager_escalation"),
  v.literal("assignment_handoff"),
);

const scheduledReminderKind = v.union(
  v.literal("dispatch_overdue"),
  v.literal("eta_warning"),
  v.literal("eta_due"),
  v.literal("overdue"),
  v.literal("manager_escalation"),
);

const queueRecord = v.object({
  _id: v.id("deliveries"),
  saleId: v.id("sales"),
  orderNumber: v.string(),
  status: deliveryStatus,
  addressLabel: v.string(),
  assignedToUserId: v.optional(v.string()),
  profileId: v.optional(v.id("deliveryProfiles")),
  vendorExpenseKnown: v.optional(v.boolean()),
  vendorFeeCents: v.number(),
  customerFeeCents: v.number(),
  deliveryTaxCents: v.number(),
  dispatchDueAt: v.number(),
  estimatedArrivalAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const eventRecord = v.object({
  _id: v.id("deliveryEvents"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  deliveryId: v.id("deliveries"),
  actorUserId: v.string(),
  type: v.union(
    v.literal("created"),
    v.literal("assigned"),
    v.literal("status_changed"),
    v.literal("reminder_emitted"),
    v.literal("financial_adjustment_recorded"),
    v.literal("address_accessed"),
  ),
  fromStatus: v.optional(v.string()),
  toStatus: v.optional(v.string()),
  metadata: v.string(),
  createdAt: v.number(),
});

const adjustmentRecord = v.object({
  _id: v.id("deliveryFinancialAdjustments"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  deliveryId: v.id("deliveries"),
  saleId: v.id("sales"),
  kind: v.union(
    v.literal("customer_fee_refund"),
    v.literal("vendor_credit"),
    v.literal("delivery_tax_refund"),
  ),
  idempotencyKey: v.string(),
  amountCents: v.number(),
  reason: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
});

const notificationRecord = v.object({
  _id: v.id("deliveryNotifications"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  deliveryId: v.id("deliveries"),
  targetUserId: v.optional(v.string()),
  targetRole: v.optional(v.literal("manager")),
  kind: reminderKind,
  message: v.string(),
  scheduledFor: v.number(),
  createdAt: v.number(),
  acknowledgedAt: v.optional(v.number()),
});

type DeliveryStatus =
  | "ready_for_dispatch"
  | "uber_ordered"
  | "handed_off"
  | "delivered"
  | "canceled";

const ALLOWED_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  ready_for_dispatch: ["uber_ordered", "canceled"],
  uber_ordered: ["handed_off", "canceled"],
  handed_off: ["delivered", "canceled"],
  delivered: [],
  canceled: [],
};

function isManager(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function requirePositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`INVALID_ARGUMENT: ${field} must be a positive integer`);
  }
}

async function requireDelivery(
  ctx: MutationCtx | QueryCtx,
  deliveryId: Id<"deliveries">,
  businessId: Id<"businesses">,
): Promise<Doc<"deliveries">> {
  const delivery = await ctx.db.get(deliveryId);
  if (!delivery || delivery.businessId !== businessId) {
    throw new Error(`NOT_FOUND: Delivery '${deliveryId}' not found`);
  }
  return delivery;
}

function requireAssignedOperator(
  delivery: Doc<"deliveries">,
  userId: string,
  role: string,
): void {
  if (!isManager(role) && delivery.assignedToUserId !== userId) {
    throw new Error(
      "FORBIDDEN: Delivery must be assigned to the active operator",
    );
  }
}

async function appendEvent(
  ctx: MutationCtx,
  input: {
    businessId: Id<"businesses">;
    deliveryId: Id<"deliveries">;
    actorUserId: string;
    type: Doc<"deliveryEvents">["type"];
    fromStatus?: string;
    toStatus?: string;
    metadata?: Record<string, unknown>;
    createdAt?: number;
  },
): Promise<void> {
  await ctx.db.insert("deliveryEvents", {
    businessId: input.businessId,
    deliveryId: input.deliveryId,
    actorUserId: input.actorUserId,
    type: input.type,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    metadata: JSON.stringify(input.metadata ?? {}),
    createdAt: input.createdAt ?? Date.now(),
  });
}

async function transitionDelivery(
  ctx: MutationCtx,
  input: {
    delivery: Doc<"deliveries">;
    actorUserId: string;
    nextStatus: DeliveryStatus;
    patch?: Partial<Doc<"deliveries">>;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const current = input.delivery.status as DeliveryStatus;
  if (!ALLOWED_TRANSITIONS[current].includes(input.nextStatus)) {
    throw new Error(
      `INVALID_STATE: Delivery cannot transition from '${current}' to '${input.nextStatus}'`,
    );
  }
  const now = Date.now();
  await ctx.db.patch(input.delivery._id, {
    ...input.patch,
    status: input.nextStatus,
    updatedAt: now,
  });
  await appendEvent(ctx, {
    businessId: input.delivery.businessId,
    deliveryId: input.delivery._id,
    actorUserId: input.actorUserId,
    type: "status_changed",
    fromStatus: current,
    toStatus: input.nextStatus,
    metadata: input.metadata,
    createdAt: now,
  });
}

function toQueueRecord(delivery: Doc<"deliveries">, orderNumber: string) {
  return {
    _id: delivery._id,
    saleId: delivery.saleId,
    orderNumber,
    status: delivery.status,
    addressLabel: "Address on file",
    assignedToUserId: delivery.assignedToUserId,
    vendorFeeCents: delivery.vendorFeeCents,
    customerFeeCents: delivery.customerFeeCents,
    deliveryTaxCents: delivery.deliveryTaxCents,
    dispatchDueAt: delivery.dispatchDueAt,
    estimatedArrivalAt: delivery.estimatedArrivalAt,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

export const listDeliveries = query({
  args: {},
  returns: v.array(queueRecord),
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const deliveries = await ctx.db
      .query("deliveries")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .collect();
    const records = await Promise.all(
      deliveries.map(async (delivery) => {
        const sale = await ctx.db.get(delivery.saleId);
        return toQueueRecord(delivery, sale?.orderNumber ?? "Unknown order");
      }),
    );
    return records.sort((left, right) => {
      const leftTerminal =
        left.status === "delivered" || left.status === "canceled";
      const rightTerminal =
        right.status === "delivered" || right.status === "canceled";
      if (leftTerminal !== rightTerminal) return leftTerminal ? 1 : -1;
      return left.dispatchDueAt - right.dispatchDueAt;
    });
  },
});

export const getDelivery = query({
  args: { deliveryId: v.id("deliveries") },
  returns: v.object({
    delivery: queueRecord,
    events: v.array(eventRecord),
    adjustments: v.array(adjustmentRecord),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Delivery '${args.deliveryId}' not found`);
    }
    const sale = await ctx.db.get(delivery.saleId);
    const events = await ctx.db
      .query("deliveryEvents")
      .withIndex("by_deliveryId", (q) => q.eq("deliveryId", delivery._id))
      .order("asc")
      .collect();
    const adjustments = await ctx.db
      .query("deliveryFinancialAdjustments")
      .withIndex("by_deliveryId", (q) => q.eq("deliveryId", delivery._id))
      .order("asc")
      .collect();
    return {
      delivery: toQueueRecord(delivery, sale?.orderNumber ?? "Unknown order"),
      events,
      adjustments,
    };
  },
});

export const getDeliveryAddress = mutation({
  args: { deliveryId: v.id("deliveries") },
  returns: v.object({ address: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    requireAssignedOperator(delivery, auth.userId, auth.userRecord.role);
    const address = await decryptDeliveryAddress(delivery.addressEncrypted, {
      businessId: String(delivery.businessId),
      saleId: String(delivery.saleId),
      deliveryId: String(delivery._id),
    });
    await appendEvent(ctx, {
      businessId: auth.businessId,
      deliveryId: delivery._id,
      actorUserId: auth.userId,
      type: "address_accessed",
    });
    return { address };
  },
});

export const assignDelivery = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    assigneeUserId: v.optional(v.string()),
  },
  returns: v.object({ success: v.literal(true), assignedToUserId: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    if (delivery.status === "delivered" || delivery.status === "canceled") {
      throw new Error(
        "INVALID_STATE: Terminal deliveries cannot be reassigned",
      );
    }
    const assigneeUserId = args.assigneeUserId?.trim() || auth.userId;
    if (!isManager(auth.userRecord.role) && assigneeUserId !== auth.userId) {
      throw new Error(
        "FORBIDDEN: Operators may only assign deliveries to themselves",
      );
    }
    if (
      !isManager(auth.userRecord.role) &&
      delivery.assignedToUserId &&
      delivery.assignedToUserId !== auth.userId
    ) {
      throw new Error(
        "FORBIDDEN: Delivery is already assigned to another operator",
      );
    }
    const assignee = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId_and_businessId", (q) => q.eq("clerkUserId", assigneeUserId).eq("businessId", auth.businessId))
      .unique();
    if (
      !assignee ||
      assignee.businessId !== auth.businessId ||
      assignee.status !== "ACTIVE"
    ) {
      throw new Error(
        `NOT_FOUND: Active tenant operator '${assigneeUserId}' not found`,
      );
    }
    const now = Date.now();
    let supersededNotificationCount = 0;
    let supersededOutboxCount = 0;
    if (
      delivery.assignedToUserId &&
      delivery.assignedToUserId !== assigneeUserId
    ) {
      const oldNotifications = await ctx.db
        .query("deliveryNotifications")
        .withIndex("by_deliveryId_and_targetUserId_and_acknowledgedAt", (q) =>
          q
            .eq("deliveryId", delivery._id)
            .eq("targetUserId", delivery.assignedToUserId)
            .eq("acknowledgedAt", undefined),
        )
        .take(500);
      for (const notification of oldNotifications) {
        await ctx.db.patch(notification._id, { acknowledgedAt: now });
        const outboxRows = await ctx.db
          .query("deliveryPushOutbox")
          .withIndex("by_notificationId", (q) =>
            q.eq("notificationId", notification._id),
          )
          .take(20);
        for (const outbox of outboxRows) {
          if (
            outbox.targetUserId === delivery.assignedToUserId &&
            (outbox.status === "queued" ||
              outbox.status === "retry_scheduled" ||
              outbox.status === "dispatching")
          ) {
            await ctx.db.patch(outbox._id, {
              status: "canceled",
              lastErrorCode: "ASSIGNMENT_SUPERSEDED",
              leaseExpiresAt: undefined,
              updatedAt: now,
            });
            supersededOutboxCount += 1;
          }
        }
        await enqueueDeliveryPushCancellation(ctx, {
          businessId: auth.businessId,
          notificationId: notification._id,
          deliveryId: delivery._id,
          targetUserId: delivery.assignedToUserId,
        });
      }
      supersededNotificationCount = oldNotifications.length;
    }
    await ctx.db.patch(delivery._id, {
      assignedToUserId: assigneeUserId,
      updatedAt: now,
    });
    await appendEvent(ctx, {
      businessId: auth.businessId,
      deliveryId: delivery._id,
      actorUserId: auth.userId,
      type: "assigned",
      metadata: {
        previousAssigneeUserId: delivery.assignedToUserId ?? null,
        assignedToUserId: assigneeUserId,
        supersededNotificationCount,
        supersededOutboxCount,
      },
      createdAt: now,
    });
    if (
      delivery.assignedToUserId &&
      delivery.assignedToUserId !== assigneeUserId
    ) {
      const notificationId = await ctx.db.insert("deliveryNotifications", {
        businessId: auth.businessId,
        deliveryId: delivery._id,
        targetUserId: assigneeUserId,
        kind: "assignment_handoff",
        message:
          "A delivery is now assigned to you. Open Deliveries to check it.",
        scheduledFor: now,
        createdAt: now,
      });
      await enqueueDeliveryPush(ctx, {
        businessId: auth.businessId,
        notificationId,
        deliveryId: delivery._id,
        targetUserId: assigneeUserId,
        kind: "assignment_handoff",
        scheduledFor: now,
      });
    }
    return { success: true as const, assignedToUserId: assigneeUserId };
  },
});

export const markUberOrdered = mutation({
  args: { deliveryId: v.id("deliveries"), waitMinutes: v.number() },
  returns: v.object({
    success: v.literal(true),
    estimatedArrivalAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    requirePositiveSafeInteger(args.waitMinutes, "waitMinutes");
    if (args.waitMinutes > 24 * 60) {
      throw new Error("INVALID_ARGUMENT: waitMinutes cannot exceed 1440");
    }
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    requireAssignedOperator(delivery, auth.userId, auth.userRecord.role);
    const now = Date.now();
    const estimatedArrivalAt = now + args.waitMinutes * 60_000;
    await transitionDelivery(ctx, {
      delivery,
      actorUserId: auth.userId,
      nextStatus: "uber_ordered",
      patch: { estimatedArrivalAt },
      metadata: { waitMinutes: args.waitMinutes, estimatedArrivalAt },
    });
    const warningAt = Math.max(now, estimatedArrivalAt - 2 * 60_000);
    const reminders: Array<{
      at: number;
      kind: "eta_warning" | "eta_due" | "overdue" | "manager_escalation";
    }> = [
      { at: warningAt, kind: "eta_warning" },
      { at: estimatedArrivalAt, kind: "eta_due" },
      { at: estimatedArrivalAt + 5 * 60_000, kind: "overdue" },
    ];
    const settings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    reminders.push({
      at:
        estimatedArrivalAt +
        (settings?.deliveryManagerEscalationMinutes ?? 10) * 60_000,
      kind: "manager_escalation",
    });
    for (const reminder of reminders) {
      await ctx.scheduler.runAt(
        reminder.at,
        internal.deliveries.processReminder,
        {
          deliveryId: delivery._id,
          kind: reminder.kind,
          expectedAt: estimatedArrivalAt,
        },
      );
    }
    return { success: true as const, estimatedArrivalAt };
  },
});

export const markHandedOff = mutation({
  args: { deliveryId: v.id("deliveries") },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    requireAssignedOperator(delivery, auth.userId, auth.userRecord.role);
    await transitionDelivery(ctx, {
      delivery,
      actorUserId: auth.userId,
      nextStatus: "handed_off",
      patch: { handedOffAt: Date.now() },
    });
    return { success: true as const };
  },
});

export const markDelivered = mutation({
  args: { deliveryId: v.id("deliveries") },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    requireAssignedOperator(delivery, auth.userId, auth.userRecord.role);
    await transitionDelivery(ctx, {
      delivery,
      actorUserId: auth.userId,
      nextStatus: "delivered",
      patch: { deliveredAt: Date.now() },
    });
    return { success: true as const };
  },
});

export const cancelDelivery = mutation({
  args: { deliveryId: v.id("deliveries"), reason: v.string() },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    if (!isManager(auth.userRecord.role)) {
      throw new Error("FORBIDDEN: Manager role required to cancel delivery");
    }
    const reason = args.reason.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new Error(
        "INVALID_ARGUMENT: Cancellation reason must be between 3 and 500 characters",
      );
    }
    await transitionDelivery(ctx, {
      delivery,
      actorUserId: auth.userId,
      nextStatus: "canceled",
      patch: { canceledAt: Date.now(), cancellationReason: reason },
      metadata: { reason },
    });
    return { success: true as const };
  },
});

export const recordFinancialAdjustment = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    kind: v.union(
      v.literal("customer_fee_refund"),
      v.literal("vendor_credit"),
      v.literal("delivery_tax_refund"),
    ),
    idempotencyKey: v.string(),
    amountCents: v.number(),
    reason: v.string(),
  },
  returns: v.object({ adjustmentId: v.id("deliveryFinancialAdjustments") }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    requirePositiveSafeInteger(args.amountCents, "amountCents");
    const delivery = await requireDelivery(
      ctx,
      args.deliveryId,
      auth.businessId,
    );
    const reason = args.reason.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new Error(
        "INVALID_ARGUMENT: Adjustment reason must be between 3 and 500 characters",
      );
    }
    const idempotencyKey = args.idempotencyKey.trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: idempotencyKey must be between 8 and 128 characters",
      );
    }
    const duplicate = await ctx.db
      .query("deliveryFinancialAdjustments")
      .withIndex("by_deliveryId_and_idempotencyKey", (q) =>
        q.eq("deliveryId", delivery._id).eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    if (duplicate) {
      if (
        duplicate.kind !== args.kind ||
        duplicate.amountCents !== args.amountCents ||
        duplicate.reason !== reason
      ) {
        throw new Error(
          "IDEMPOTENCY_CONFLICT: Adjustment key was reused with different details",
        );
      }
      return { adjustmentId: duplicate._id };
    }
    const existing = await ctx.db
      .query("deliveryFinancialAdjustments")
      .withIndex("by_deliveryId", (q) => q.eq("deliveryId", delivery._id))
      .collect();
    const alreadyAdjustedCents = existing
      .filter((adjustment) => adjustment.kind === args.kind)
      .reduce((sum, adjustment) => sum + adjustment.amountCents, 0);
    const maximumCents =
      args.kind === "customer_fee_refund"
        ? delivery.customerFeeCents
        : args.kind === "vendor_credit"
          ? delivery.vendorFeeCents
          : delivery.deliveryTaxCents;
    if (alreadyAdjustedCents + args.amountCents > maximumCents) {
      throw new Error(
        `INVALID_ARGUMENT: ${args.kind} adjustments cannot exceed ${maximumCents} cents`,
      );
    }
    const now = Date.now();
    const adjustmentId = await ctx.db.insert("deliveryFinancialAdjustments", {
      businessId: auth.businessId,
      deliveryId: delivery._id,
      saleId: delivery.saleId,
      kind: args.kind,
      idempotencyKey,
      amountCents: args.amountCents,
      reason,
      createdBy: auth.userId,
      createdAt: now,
    });
    await appendEvent(ctx, {
      businessId: auth.businessId,
      deliveryId: delivery._id,
      actorUserId: auth.userId,
      type: "financial_adjustment_recorded",
      metadata: {
        adjustmentId,
        kind: args.kind,
        amountCents: args.amountCents,
      },
      createdAt: now,
    });
    return { adjustmentId };
  },
});

export const listNotifications = query({
  args: { deliveryId: v.optional(v.id("deliveries")) },
  returns: v.array(notificationRecord),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    if (!args.deliveryId) {
      throw new Error(
        "INVALID_ARGUMENT: deliveryId is required for notification history; use listUnreadNotifications for the active user's queue",
      );
    }
    await requireDelivery(ctx, args.deliveryId, auth.businessId);
    return ctx.db
      .query("deliveryNotifications")
      .withIndex("by_deliveryId", (q) => q.eq("deliveryId", args.deliveryId!))
      .order("asc")
      .collect();
  },
});

export const listUnreadNotifications = query({
  args: { deliveryId: v.optional(v.id("deliveries")) },
  returns: v.array(notificationRecord),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    if (args.deliveryId) {
      await requireDelivery(ctx, args.deliveryId, auth.businessId);
    }
    const direct = await ctx.db
      .query("deliveryNotifications")
      .withIndex("by_businessId_and_targetUserId_and_acknowledgedAt", (q) =>
        q
          .eq("businessId", auth.businessId)
          .eq("targetUserId", auth.userId)
          .eq("acknowledgedAt", undefined),
      )
      .order("desc")
      .take(100);
    const manager = isManager(auth.userRecord.role)
      ? await ctx.db
          .query("deliveryNotifications")
          .withIndex("by_businessId_and_targetRole_and_acknowledgedAt", (q) =>
            q
              .eq("businessId", auth.businessId)
              .eq("targetRole", "manager")
              .eq("acknowledgedAt", undefined),
          )
          .order("desc")
          .take(100)
      : [];
    const unique = new Map(
      [...direct, ...manager].map((notification) => [
        String(notification._id),
        notification,
      ]),
    );
    return [...unique.values()]
      .filter(
        (notification) =>
          (notification.targetUserId === auth.userId ||
            (notification.targetUserId === undefined &&
              notification.targetRole === "manager" &&
              isManager(auth.userRecord.role))) &&
          (!args.deliveryId || notification.deliveryId === args.deliveryId),
      )
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 100);
  },
});

export const acknowledgeNotification = mutation({
  args: { notificationId: v.id("deliveryNotifications") },
  returns: v.object({
    notificationId: v.id("deliveryNotifications"),
    acknowledgedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_DELIVERIES");
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.businessId !== auth.businessId) {
      throw new Error("NOT_FOUND: Delivery notification not found");
    }
    const isDirectTarget = notification.targetUserId === auth.userId;
    const isManagerTarget =
      notification.targetUserId === undefined &&
      notification.targetRole === "manager" &&
      isManager(auth.userRecord.role);
    if (!isDirectTarget && !isManagerTarget) {
      throw new Error(
        "FORBIDDEN: Delivery notification is not assigned to this user",
      );
    }
    if (notification.acknowledgedAt !== undefined) {
      return {
        notificationId: notification._id,
        acknowledgedAt: notification.acknowledgedAt,
      };
    }
    const acknowledgedAt = Date.now();
    await ctx.db.patch(notification._id, { acknowledgedAt });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "DELIVERY_NOTIFICATION_ACKNOWLEDGED",
      entityType: "delivery_notification",
      entityId: notification._id,
      metadata: JSON.stringify({ deliveryId: notification.deliveryId }),
      timestamp: acknowledgedAt,
    });
    return { notificationId: notification._id, acknowledgedAt };
  },
});

export const processReminder = internalMutation({
  args: {
    deliveryId: v.id("deliveries"),
    kind: scheduledReminderKind,
    expectedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return null;
    if (delivery.status === "delivered" || delivery.status === "canceled") {
      return null;
    }
    if (args.kind === "dispatch_overdue") {
      if (
        delivery.status !== "ready_for_dispatch" ||
        delivery.dispatchDueAt !== args.expectedAt
      ) {
        return null;
      }
    } else if (
      delivery.status !== "uber_ordered" ||
      delivery.estimatedArrivalAt !== args.expectedAt
    ) {
      return null;
    }

    const now = Date.now();
    const settings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) =>
        q.eq("businessId", delivery.businessId),
      )
      .unique();
    const managerTargets =
      args.kind === "manager_escalation"
        ? (settings?.deliveryManagerNotificationUserIds ?? [])
        : [delivery.assignedToUserId].filter((value): value is string =>
            Boolean(value),
          );
    let targets = managerTargets;
    if (targets.length === 0) {
      const tenantUsers = await ctx.db
        .query("users")
        .withIndex("by_businessId", (q) =>
          q.eq("businessId", delivery.businessId),
        )
        .take(100);
      targets = tenantUsers
        .filter(
          (user) =>
            user.status === "ACTIVE" &&
            (user.role === "OWNER" || user.role === "ADMIN"),
        )
        .map((user) => user.clerkUserId);
    }
    const messages = {
      dispatch_overdue:
        "This delivery is late to leave. Request a courier now.",
      eta_warning:
        "The courier arrives in about two minutes. Get the order ready.",
      eta_due: "The courier should be here. Confirm the handoff.",
      overdue: "This delivery handoff is late.",
      manager_escalation:
        "A delivery handoff is late. A manager needs to check it.",
      assignment_handoff:
        "A delivery is now assigned to you. Open Deliveries to check it.",
    } as const;
    for (const targetUserId of targets) {
      const notificationId = await ctx.db.insert("deliveryNotifications", {
        businessId: delivery.businessId,
        deliveryId: delivery._id,
        targetUserId,
        kind: args.kind,
        message: messages[args.kind],
        scheduledFor: now,
        createdAt: now,
      });
      await enqueueDeliveryPush(ctx, {
        businessId: delivery.businessId,
        notificationId,
        deliveryId: delivery._id,
        targetUserId,
        kind: args.kind,
        scheduledFor: now,
      });
    }
    await appendEvent(ctx, {
      businessId: delivery.businessId,
      deliveryId: delivery._id,
      actorUserId: "system",
      type: "reminder_emitted",
      metadata: { kind: args.kind, targetCount: targets.length },
      createdAt: now,
    });
    if (args.kind === "overdue") {
      await ctx.scheduler.runAfter(
        5 * 60_000,
        internal.deliveries.processReminder,
        args,
      );
    }
    return null;
  },
});

export { deliveryStatus };
