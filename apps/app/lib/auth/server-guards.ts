import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { Permission, Role, ROLE_PERMISSIONS } from "./permissions";
import { redirect } from "next/navigation";

export async function getCurrentUserRole(
  businessId?: string,
): Promise<Role | null> {
  if (isAuthBypassEnabled()) {
    return "super_admin" as Role;
  }

  const { userId } = await auth();

  if (!userId) return null;

  // Query role from Prisma
  // If businessId is provided, filter by it.
  const userRole = await db.userRole.findFirst({
    where: {
      userId: userId,
      ...(businessId ? { businessId } : {}),
    },
    select: { role: true },
  });

  return (userRole?.role as Role) || null;
}

export async function hasPermission(
  permission: Permission,
  businessId?: string,
): Promise<boolean> {
  if (isAuthBypassEnabled()) {
    return true;
  }

  const { userId } = await auth();

  if (!userId) return false;

  // Fetch full role with permissions
  const userRole = await db.userRole.findFirst({
    where: {
      userId: userId,
      ...(businessId ? { businessId } : {}),
    },
    select: { permissions: true, role: true },
  });

  if (!userRole) return false;

  // Super admin bypass
  if (userRole.role === "super_admin") return true;

  // Assuming permissions is a JSON object like { "inventory:read": true }
  const perms = userRole.permissions as Record<string, boolean>;

  return !!perms?.[permission];
}

export async function hasBusinessPermission(
  userId: string,
  businessId: string,
  permission: Permission,
): Promise<boolean> {
  if (isAuthBypassEnabled()) return true;

  const ownedBusiness = await db.businessProfile.findFirst({
    where: { id: businessId, ownerId: userId },
    select: { id: true },
  });
  if (ownedBusiness) return true;

  const userRole = await db.userRole.findFirst({
    where: { userId, businessId },
    select: { permissions: true, role: true },
  });
  if (!userRole) return false;

  const explicitPermissions = userRole.permissions as Record<string, boolean> | null;
  if (explicitPermissions?.[permission]) return true;

  const role = userRole.role as Role | null;
  return role ? (ROLE_PERMISSIONS[role] ?? []).includes(permission) : false;
}

// These guard helpers are kept as route-level building blocks even when
// direct static references are sparse or config-driven.
export async function requirePermission(permission: Permission) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error(`Unauthorized: Missing permission ${permission}`);
  }
}

export async function requireAnyPermission(permissions: Permission[]) {
  for (const permission of permissions) {
    if (await hasPermission(permission)) {
      return;
    }
  }

  throw new Error(`Unauthorized: Missing required permission (${permissions.join(", ")})`);
}

export async function requireRole(role: Role) {
  const currentRole = await getCurrentUserRole();
  // Super admin check handles hierarchy effectively for now
  if (currentRole !== role && currentRole !== "super_admin") {
    throw new Error(`Unauthorized: Requires role ${role}`);
  }
}

export async function protectRoute(permission: Permission) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    redirect("/login");
  }
}
