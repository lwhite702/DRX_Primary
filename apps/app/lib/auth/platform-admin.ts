import "server-only";
import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

/** Platform authority comes only from AdminUser, never from tenant roles. */
export async function getPlatformAdmin() {
  if (isAuthBypassEnabled()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const token = await getConvexAuthToken();
  if (!url || !token) return null;
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  try {
    await client.query(api.platformAdmin.listBusinesses, {});
    return { userId };
  } catch { return null; }
}

export async function requirePlatformAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) throw new Error("Platform administrator access required");
  return admin;
}
