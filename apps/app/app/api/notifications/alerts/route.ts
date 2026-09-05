import { NextRequest } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { canManageNotificationRecipient } from "@/lib/auth/notification-access";
import { db } from "@/lib/db";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";

const AlertPayloadSchema = z.object({
  userId: z.string().min(1).optional(),
  type: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId: actorId } = await auth();

    if (!actorId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const availabilityEnabled = await ensureServerFlag(
      OPS_AVAILABILITY_FLAGS.notificationsAlertsWrite,
      { distinctId: actorId, defaultValue: true },
    );

    if (!availabilityEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Notification alerts writes are temporarily disabled",
        503,
      );
    }

    const featureEnabled = await ensureServerFlag("feat_notifications_alert_write", {
      distinctId: actorId,
      defaultValue: true,
    });
    if (!featureEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Notification alert feature is temporarily disabled",
        503,
      );
    }

    const payload = AlertPayloadSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid payload",
        400,
        payload.error.flatten(),
      );
    }

    const targetUserId = payload.data.userId ?? actorId;
    if (!(await canManageNotificationRecipient(request, actorId, targetUserId))) {
      return errorResponse("FORBIDDEN", "Recipient access denied", 403);
    }

    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        type: payload.data.type,
        message: payload.data.message,
        title: "Alert",
        link: null,
        isRead: false,
      },
    });

    await db.systemAuditLog.create({
      data: {
        action: "create_alert",
        userId: actorId,
        entityType: "notification",
        entityId: notification.id,
        newValues: {
          userId: targetUserId,
          type: payload.data.type,
          notificationId: notification.id,
          ...(payload.data.metadata !== undefined
            ? { metadata: payload.data.metadata }
            : {}),
        },
      },
    });

    return successResponse(
      {
        notificationId: notification.id,
        userId: targetUserId,
        message: notification.message,
      },
      201,
    );
  } catch (error: unknown) {
    console.error("Create alert error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}
