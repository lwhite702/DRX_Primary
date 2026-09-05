import { NextRequest } from "next/server";
import { db } from "@/lib/db";
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
    let items;
    if (query.get("resource_type") === "inventory") {
      if (!resourceId) return errorResponse("BAD_REQUEST", "Missing resource_id", 400);
      items = await db.inventoryLog.findMany({
        where: { inventoryId: resourceId, inventory: { businessId } },
        include: { inventory: { select: { businessId: true } } },
        orderBy: { createdAt: "desc" }, take: 100,
      });
    } else {
      items = await db.systemAuditLog.findMany({
        where: { businessId, ...(userId ? { entityId: userId } : {}) },
        orderBy: { createdAt: "desc" }, take: 100,
      });
    }
    return successResponse({ items, data: items, count: items.length });
  } catch {
    return errorResponse("INTERNAL_ERROR", "Audit records unavailable", 500);
  }
}
