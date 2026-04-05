import { NextRequest } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { hasPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_KILL_SWITCH_FLAGS } from "@/lib/posthog/flags-manifest";

const AlertPayloadSchema = z.object({
  userId: z.string().min(1).optional(),
  type: z.string().min(1),
  message: z.string().min(1),
  metadata: z.unknown().optional(),
});

function isJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (isJsonValue(value)) return value;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const { userId: actorId } = await auth();

  if (!actorId) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const killSwitchEnabled = await ensureServerFlag(
    OPS_KILL_SWITCH_FLAGS.notificationsAlertsWrite,
    { distinctId: actorId, defaultValue: true },
  );

  if (!killSwitchEnabled) {
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

  try {
    const payload = AlertPayloadSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid payload",
        400,
        payload.error.flatten(),
      );
    }

    const canManageUsers =
      (await hasPermission("users.manage_all")) ||
      (await hasPermission("staff.manage"));
    const targetUserId = canManageUsers
      ? payload.data.userId ?? actorId
      : actorId;

    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        type: payload.data.type,
        message: payload.data.message,
        title: "Alert", // providing a default title as it's required in schema
        link: null,
        isRead: false,
      },
    });

    const normalizedMetadata = toInputJsonValue(payload.data.metadata);

    // Audit Log
    await db.systemAuditLog.create({
      data: {
        action: "create_alert",
        userId: actorId, // Acted by
        entityType: "notification",
        entityId: notification.id,
        newValues: {
          userId: targetUserId,
          type: payload.data.type,
          notificationId: notification.id,
          ...(normalizedMetadata !== undefined ? { metadata: normalizedMetadata } : {}),
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
