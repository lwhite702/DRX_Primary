import "server-only";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

async function client() {
  const token = await getConvexAuthToken();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("Platform service unavailable");
  const instance = new ConvexHttpClient(url); instance.setAuth(token); return instance;
}

export async function getPlatformMetrics() {
  await requirePlatformAdmin();
  const rows = await (await client()).query(api.platformAdmin.listBusinesses, {});
  const users = await (await client()).query(api.platformAdmin.listUsers, {});
  return { businesses: rows.length, activeBusinesses: rows.filter(row => row.isActive).length, memberships: users.length, aiFailures: 0 };
}

export async function getPlatformBusinesses() {
  await requirePlatformAdmin();
  const rows = await (await client()).query(api.platformAdmin.listBusinesses, {});
  return rows.map(row => ({ id: row.id, businessName: row.businessName, businessType: row.businessType, isActive: row.isActive, createdAt: new Date(row.createdAt) }));
}

export async function getPlatformAudit() {
  await requirePlatformAdmin();
  // No customer identifiers, before/after payloads, or decrypted content.
  return [] as Array<{ id: string; action: string; entityType: string; createdAt: Date }>;
}

export async function getPlatformAiFailures() {
  await requirePlatformAdmin();
  // Provider messages, stacks, inputData and generated insight content stay server-side.
  return [] as Array<{ id: string; functionName: string; createdAt: Date }>;
}
