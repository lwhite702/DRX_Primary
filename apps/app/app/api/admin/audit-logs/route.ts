import { NextRequest } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/auth/server-guards";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

export async function GET(request: NextRequest) {
  try {
    const { userId: actorId } = await auth();

    if (!actorId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const canViewAudit = await hasPermission("audit.view");
    if (!canViewAudit) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const featureEnabled = await ensureServerFlag("feat_admin_audit_access", {
      distinctId: actorId,
      defaultValue: true,
    });
    if (!featureEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Admin audit access is temporarily disabled",
        503,
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceId = searchParams.get("resource_id");
    const resourceType = searchParams.get("resource_type");
    const userId = searchParams.get("userId");
    const requestedBusinessId =
      searchParams.get("business_id") || searchParams.get("tenantId");
    const { businessId: actorBusinessId } = await resolveAuthContext();
    const superAdminRole = await db.userRole.findFirst({
      where: { userId: actorId, role: "super_admin" },
      select: { id: true },
    });
    const isSuperAdmin = Boolean(superAdminRole);

    if (!isSuperAdmin && !actorBusinessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    let effectiveBusinessId: string | null = actorBusinessId;
    if (requestedBusinessId) {
      if (isSuperAdmin) {
        effectiveBusinessId = requestedBusinessId;
      } else {
        const canAccessRequestedBusiness =
          requestedBusinessId === actorBusinessId ||
          Boolean(
            await db.userRole.findFirst({
              where: { userId: actorId, businessId: requestedBusinessId },
              select: { id: true },
            }),
          ) ||
          Boolean(
            await db.businessProfile.findFirst({
              where: { id: requestedBusinessId, ownerId: actorId },
              select: { id: true },
            }),
          );

        if (!canAccessRequestedBusiness) {
          return errorResponse("FORBIDDEN", "Forbidden", 403);
        }

        effectiveBusinessId = requestedBusinessId;
      }
    }

    let data: any[] = [];

    if (userId) {
      // Query generic system audit log for user
      data = await db.systemAuditLog.findMany({
        where: {
          entityId: userId,
          ...(effectiveBusinessId ? { businessId: effectiveBusinessId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (resourceType === "inventory") {
      if (!resourceId) {
        return errorResponse("BAD_REQUEST", "Missing resource_id", 400);
      }
      data = await db.inventoryLog.findMany({
        where: {
          inventoryId: resourceId,
          ...(effectiveBusinessId
            ? { inventory: { businessId: effectiveBusinessId } }
            : {}),
        },
        include: { inventory: { select: { businessId: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else if (effectiveBusinessId) {
      // General business audit logs
      data = await db.systemAuditLog.findMany({
        where: { businessId: effectiveBusinessId },
        orderBy: { createdAt: "desc" },
      });
    } else if (isSuperAdmin) {
      // Super-admin can request global logs only when no business scope is selected.
      data = await db.systemAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    } else {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const mapped = data.map((log) => {
      const mappedLog: any = { ...log };
      if (userId) {
        mappedLog.userId = log.entityId;
        mappedLog.action = log.action;
      }
      return mappedLog;
    });

    return successResponse({ items: mapped, data: mapped, count: mapped.length });
  } catch (error) {
    console.error("Audit Log API Error:", error);
    return errorResponse("INTERNAL_ERROR", "Server Error", 500);
  }
}
