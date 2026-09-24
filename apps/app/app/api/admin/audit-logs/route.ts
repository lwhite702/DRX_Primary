import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

// Compatibility URL for BUSINESS audit clients, not a platform-authority API.
// Platform audit uses its separately guarded, data-minimized server query.
export async function GET(request: NextRequest) {
  try {
    const { userId: actorId, businessId } = await resolveAuthContext(request);
    if (!actorId || !businessId) return errorResponse("FORBIDDEN", "Business access required", 403);
    if (!(await hasBusinessPermission(actorId, businessId, "audit.view"))) return errorResponse("FORBIDDEN", "Forbidden", 403);
    if (!(await ensureServerFlag("feat_admin_audit_access", { distinctId: actorId, defaultValue: true }))) {
      return errorResponse("FEATURE_DISABLED", "Audit access is temporarily disabled", 503);
    }
    const query = request.nextUrl.searchParams;
    const requested = query.get("business_id") || query.get("businessId") || query.get("tenantId");
    if (requested && requested !== businessId) return errorResponse("FORBIDDEN", "Business access denied", 403);
    const userId = query.get("userId");
    const resourceId = query.get("resource_id");
    const rawLimit = Number(query.get("limit") || "50");
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const cursor = query.get("cursor");

    const { client } = await businessClient(request);
    const items = await client.query(api.audit.listForBusiness, { businessId, limit, before: cursor ? Number(cursor) : undefined, resourceType: query.get("resource_type") ?? undefined, resourceId: resourceId ?? undefined });
    const data = items.map(item => ({ ...item, createdAt: new Date(item.timestamp).toISOString() }));
    const nextCursor = items.length === limit ? String(items[items.length - 1].timestamp) : null;
    return successResponse({ items: data, data, count: data.length, nextCursor });
    /*
    if (query.get("resource_type") === "inventory") {
      if (!resourceId) return errorResponse("BAD_REQUEST", "Missing resource_id", 400);
      items = await db.inventoryLog.findMany({
        where: {
          inventoryId: resourceId,
          inventory: { businessId },
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        include: { inventory: { select: { businessId: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } else {
      items = await db.systemAuditLog.findMany({
        where: {
          businessId,
          ...(userId ? { entityId: userId } : {}),
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }
    const nextCursor = items.length === limit ? items[items.length - 1]?.createdAt.toISOString() : null;
    return successResponse({ items, data: items, count: items.length, nextCursor });
    */
  } catch {
    return errorResponse("INTERNAL_ERROR", "Audit records unavailable", 500);
  }
}
