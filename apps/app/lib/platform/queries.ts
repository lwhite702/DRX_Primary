import "server-only";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
const platformDb: PrismaClient = db;

export async function getPlatformMetrics() {
  await requirePlatformAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [businesses, activeBusinesses, memberships, aiFailures] = await Promise.all([
    platformDb.businessProfile.count(),
    platformDb.businessProfile.count({ where: { isActive: true } }),
    platformDb.userRole.count(),
    platformDb.aiInsightFailure.count({ where: { createdAt: { gte: since } } }),
  ]);
  return { businesses, activeBusinesses, memberships, aiFailures };
}

export async function getPlatformBusinesses() {
  await requirePlatformAdmin();
  return platformDb.businessProfile.findMany({
    select: { id: true, businessName: true, businessType: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 100,
  });
}

export async function getPlatformAudit() {
  await requirePlatformAdmin();
  // No customer identifiers, before/after payloads, or decrypted content.
  return platformDb.systemAuditLog.findMany({
    where: { businessId: null },
    select: { id: true, action: true, entityType: true, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 100,
  });
}

export async function getPlatformAiFailures() {
  await requirePlatformAdmin();
  // Provider messages, stacks, inputData and generated insight content stay server-side.
  return platformDb.aiInsightFailure.findMany({
    select: { id: true, functionName: true, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 100,
  });
}
