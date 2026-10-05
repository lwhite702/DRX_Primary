import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import type { Permission } from "@/lib/auth/permissions";

type CustomerAccessContext =
  | {
      ok: true;
      userId: string;
      businessId: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export async function resolveCustomerAccess(
  request: Request,
  permission: Extract<Permission, "customers.view" | "customers.manage">,
): Promise<CustomerAccessContext> {
  const { userId, businessId } = await resolveAuthContext(request);
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!businessId) {
    return { ok: false, status: 403, error: "Business access denied" };
  }

  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return {
      ok: true,
      userId: userId || process.env.BYPASS_AUTH_USER_ID || "user_required_ux",
      businessId: businessId || process.env.BYPASS_AUTH_ORG_ID || "org_required_ux",
    };
  }
  if (!(await hasBusinessPermission(userId, businessId, permission))) {
    return { ok: false, status: 403, error: "Access denied" };
  }

  return { ok: true, userId, businessId };
}
