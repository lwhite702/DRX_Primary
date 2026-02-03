import { NextRequest, NextResponse } from "next/server";
import { auth } from "@wrelik/auth/next";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch logs for this user (entityId = id)
    // Legacy had OR condition resource_id.eq.id.
    // In Prisma SystemAuditLog, we use entityId for the primary target.

    const logs = await db.systemAuditLog.findMany({
      where: {
        entityId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Fetch member audit logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
