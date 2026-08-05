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

  const [ownedBusiness, assignedRole, user] = await Promise.all([
    db.businessProfile.findFirst({
      where: { ownerId: userId, isActive: true },
      select: { id: true, businessName: true },
    }),
    db.userRole.findFirst({
      where: { userId, business: { isActive: true } },
      select: {
        role: true,
        permissions: true,
        business: { select: { id: true, businessName: true } },
      },
    }),
    db.user.findFirst({
      where: { clerkUserId: userId, status: "ACTIVE" },
      select: { name: true, email: true },
    }),
  ]);

  const business = ownedBusiness ?? assignedRole?.business;
  if (!business) {
    return NextResponse.json(
      {
        error: "Account is not provisioned for Deelrx CRM",
        code: "MOBILE_ACCOUNT_NOT_PROVISIONED",
      },
      { status: 403 },
    );
  }

  const role = ownedBusiness ? "owner" : (assignedRole?.role?.toLowerCase() ?? "staff");

  return NextResponse.json({
    operator_id: userId,
    display_name: user?.name || user?.email || "Deelrx Operator",
    business_id: business.id,
    business_name: business.businessName,
    roles: [role],
    permissions: permissionsFor(role, assignedRole?.permissions),
    email: user?.email ?? null,
  });
}
