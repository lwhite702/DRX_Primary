import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { hasPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";
import { z } from "zod";

const AlertPayloadSchema = z.object({
  userId: z.string().min(1).optional(),
  type: z.string().min(1),
  message: z.string().min(1),
  metadata: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const { userId: actorId } = await auth();

  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = AlertPayloadSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: payload.error.flatten() },
        { status: 400 },
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
          metadata: payload.data.metadata,
        },
      },
    });

    return NextResponse.json(
      {
        notificationId: notification.id,
        userId: targetUserId,
        message: notification.message,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
