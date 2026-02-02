import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({}, { status: 401 });

  try {
    // Fetch system audit logs for notifications
    // Prisma model SystemAuditLog
    // Fields: id, action, entityId, entityType, userId, ...
    // Legacy code filtered by resource_type="notification"
    // New schema uses `entityType`.

    const logs = await db.systemAuditLog.findMany({
      where: {
        entityType: "notification",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // implicit limit in legacy? No, but good practice.
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Fetch notification audit logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
