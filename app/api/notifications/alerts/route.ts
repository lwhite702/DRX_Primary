import { NextRequest, NextResponse } from "next/server";
import { auth } from "@wrelik/auth/next";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { userId: actorId } = await auth();

  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, type, message, metadata } = body;

  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        message,
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
        newValues: { userId, type, notificationId: notification.id },
      },
    });

    return NextResponse.json(
      {
        notificationId: notification.id,
        userId,
        message: notification.message,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Create alert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
