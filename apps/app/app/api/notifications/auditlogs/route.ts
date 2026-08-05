import { NextRequest } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/auth/server-guards";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const canViewAudit = await hasPermission("audit.view");
    if (!canViewAudit) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const { businessId } = await resolveAuthContext(request);
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 100;
    if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
      return errorResponse("VALIDATION_ERROR", "Invalid limit", 400);
    }

    // Fetch system audit logs for notifications
    const logs = await db.systemAuditLog.findMany({
      where: {
        entityType: "notification",
        businessId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return successResponse({ items: logs, data: logs, count: logs.length });
  } catch (error: unknown) {
    console.error("Fetch notification audit logs error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
      error instanceof Error ? error.message : "Unexpected server error",
    );
  }
}
