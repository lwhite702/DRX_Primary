import { NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { ROLE_PERMISSIONS, type Role } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function explicitPermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((permission): permission is string => typeof permission === "string");
  }

  if (!value || typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([, enabled]) => enabled === true)
    .map(([permission]) => permission);
}

function permissionsFor(role: string, value: unknown): string[] {
  const rolePermissions = ROLE_PERMISSIONS[role as Role] ?? [];
  return [...new Set([...rolePermissions, ...explicitPermissions(value)])];
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findFirst({
    where: { clerkUserId: userId },
    select: {
      name: true,
      email: true,
      role: true,
      status: true,
      tenant: {
        select: { id: true, businessName: true, ownerId: true, isActive: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      {
        error: "Account is not provisioned for Deelrx CRM",
        code: "MOBILE_ACCOUNT_NOT_PROVISIONED",
      },
      { status: 403 },
    );
  }

  if (user.status !== "ACTIVE" || !user.tenant.isActive) {
    return NextResponse.json(
      {
        error: "Account is inactive",
        code: "MOBILE_ACCOUNT_INACTIVE",
      },
      { status: 403 },
    );
  }

  const business = user.tenant;
  const isOwner = business.ownerId === userId;
  const assignedRole = isOwner
    ? null
    : await db.userRole.findFirst({
        where: { userId, businessId: business.id },
        select: { role: true, permissions: true },
      });
  const requestedRole = assignedRole?.role?.toLowerCase() ?? user.role.toLowerCase();
  const role = isOwner || requestedRole === "owner"
    ? "owner"
    : requestedRole in ROLE_PERMISSIONS
      ? requestedRole
      : "staff";

  return NextResponse.json({
    operator_id: userId,
    display_name: user?.name || user?.email || "Deelrx Operator",
    business_id: business.id,
    business_name: business.businessName,
    roles: [role],
    permissions: permissionsFor(role, isOwner ? null : assignedRole?.permissions),
    email: user?.email ?? null,
  });
}
