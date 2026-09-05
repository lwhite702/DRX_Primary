import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";
export { normalizeTeamRole } from "@/lib/team/roles";

type TeamManagementContext =
  | {
      ok: true;
      userId: string;
      businessId: string;
      ownerId: string;
      canManagePrivilegedRoles: boolean;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export async function resolveTeamManagementContext(
  request: Request,
): Promise<TeamManagementContext> {
  const { userId, businessId } = await resolveAuthContext(request);
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!businessId) {
    return { ok: false, status: 403, error: "Business access denied" };
  }

  const business = await db.businessProfile.findUnique({
    where: { id: businessId },
    select: { ownerId: true, isActive: true },
  });
  if (!business?.isActive) {
    return { ok: false, status: 403, error: "Business is unavailable" };
  }

  if (!(await hasBusinessPermission(userId, businessId, "staff.manage"))) {
    return { ok: false, status: 403, error: "Access denied" };
  }

  const canManagePrivilegedRoles =
    business.ownerId === userId ||
    (await hasBusinessPermission(userId, businessId, "system.manage"));

  return {
    ok: true,
    userId,
    businessId,
    ownerId: business.ownerId,
    canManagePrivilegedRoles,
  };
}

export function isPrivilegedTeamRole(role: string) {
  return role === "admin" || role === "owner" || role === "super_admin";
}

export async function findTeamMembership(businessId: string, id: string) {
  return db.userRole.findFirst({
    where: {
      businessId,
      OR: [{ id }, { userId: id }],
    },
    select: {
      id: true,
      userId: true,
      role: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
