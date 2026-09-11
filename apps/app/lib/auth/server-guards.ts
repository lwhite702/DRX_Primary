import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "./convex-token";
import type { Permission, Role } from "./permissions";
import { redirect } from "next/navigation";

async function check(permission: Permission, businessId?: string, userId?: string) {
  try {
    const token = await getConvexAuthToken();
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!token || !url) return null;
    const client = new ConvexHttpClient(url); client.setAuth(token);
    return await client.query(api.session.permission, { permission, businessId, userId });
  } catch { return null; }
}
export async function getCurrentUserRole(businessId?: string): Promise<Role | null> {
  const result = await check("catalog.view", businessId);
  return result?.role ? result.role as Role : null;
}
export async function hasPermission(permission: Permission, businessId?: string): Promise<boolean> {
  if (permission === "users.manage_all") {
    const { getPlatformAdmin } = await import("./platform-admin");
    return Boolean(await getPlatformAdmin());
  }
  return (await check(permission, businessId))?.allowed ?? false;
}
export async function hasBusinessPermission(userId: string, businessId: string, permission: Permission): Promise<boolean> {
  if (permission === "users.manage_all") return false;
  return (await check(permission, businessId, userId))?.allowed ?? false;
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
