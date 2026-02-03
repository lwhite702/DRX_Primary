import { NextRequest, NextResponse } from "next/server";
import { auth } from "@wrelik/auth/next";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { userId: actorId } = await auth();

    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceId = searchParams.get("resource_id");
    const resourceType = searchParams.get("resource_type");
    const userId = searchParams.get("userId");
    const businessId =
      searchParams.get("business_id") || searchParams.get("tenantId");

    let data: any[] = [];

    if (userId) {
      // Query generic system audit log for user
      data = await db.systemAuditLog.findMany({
        where: {
          entityId: userId,
          ...(businessId ? { businessId: businessId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (resourceType === "inventory") {
      if (!resourceId) {
        return NextResponse.json(
          { error: "Missing resource_id" },
          { status: 400 },
        );
      }
      data = await db.inventoryLog.findMany({
        where: {
          inventoryId: resourceId,
          ...(businessId ? { inventory: { businessId: businessId } } : {}),
        },
        include: { inventory: { select: { businessId: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else if (businessId) {
      // General business audit logs
      data = await db.systemAuditLog.findMany({
        where: { businessId: businessId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // If super_admin, they might want all logs
      data = await db.systemAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }

    const mapped = data.map((log) => {
      const mappedLog: any = { ...log };
      if (userId) {
        mappedLog.userId = log.entityId;
        mappedLog.action = log.action;
      }
      return mappedLog;
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Audit Log API Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
