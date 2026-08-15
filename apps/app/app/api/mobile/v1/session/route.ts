import { auth } from "@/lib/adapters/auth/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { db } from "@/lib/db";

function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((permission): permission is string => typeof permission === "string");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled === true)
      .map(([permission]) => permission);
  }

  return [];
}

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const business = orgId
      ? await db.businessProfile.findUnique({
          where: { clerkOrgId: orgId },
          select: { id: true, businessName: true, ownerId: true, isActive: true },
        })
      : await db.businessProfile.findFirst({
          where: {
            OR: [{ ownerId: userId }, { userRoles: { some: { userId } } }],
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, businessName: true, ownerId: true, isActive: true },
        });

    if (!business || !business.isActive) {
      return errorResponse(
        "FORBIDDEN",
        "No active DRX business is available for this operator.",
        403,
      );
    }

    const role = await db.userRole.findFirst({
      where: { businessId: business.id, userId },
      select: { role: true, permissions: true },
    });
    const isOwner = business.ownerId === userId;

    if (!isOwner && !role) {
      return errorResponse(
        "FORBIDDEN",
        "You do not have operator access to this DRX business.",
        403,
      );
    }

    const profile = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { email: true, name: true },
    });

    const email = profile?.email ?? null;
    const displayName =
      profile?.name ??
      email ??
      "DRX Operator";

    return successResponse({
      operatorId: userId,
      displayName: displayName || email || "DRX Operator",
      businessId: business.id,
      businessName: business.businessName,
      roles: isOwner ? ["owner"] : role?.role ? [role.role] : [],
      permissions: isOwner ? ["*"] : normalizePermissions(role?.permissions),
      email,
    });
  } catch (error) {
    console.error("Mobile session bootstrap failed:", error);
    return errorResponse("INTERNAL_ERROR", "Unable to restore the operator session", 500);
  }
}
