import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({}, { status: 401 });

  try {
    await db.notification.delete({
      where: { id },
    });

    // Audit Log
    await db.systemAuditLog.create({
      data: {
        action: "delete_alert",
        userId: userId,
        entityType: "notification",
        entityId: id,
        newValues: { notificationId: id } as any,
      },
    });

    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
