import type { Permission } from "@/lib/auth/permissions";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";

type AiBusinessContext =
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

export async function resolveAiBusinessContext(
  request: Request,
  permission: Permission,
): Promise<AiBusinessContext> {
  const { userId, businessId } = await resolveAuthContext(request);
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!businessId) {
    return { ok: false, status: 403, error: "Business access denied" };
  }

  const business = await db.businessProfile.findUnique({
    where: { id: businessId },
    select: { isActive: true },
  });
  if (!business?.isActive) {
    return { ok: false, status: 403, error: "Business is unavailable" };
  }

  if (!(await hasBusinessPermission(userId, businessId, permission))) {
    return { ok: false, status: 403, error: "Access denied" };
  }

  return { ok: true, userId, businessId };
}

export function requestedBusinessMatches(
  requestedBusinessId: string,
  resolvedBusinessId: string,
) {
  return requestedBusinessId === resolvedBusinessId;
}
