import { PermissionDeniedError, TenantRequiredError } from '@wrelik/errors';

// Helper types
type AccessChecker = (userId: string, tenantId: string) => Promise<boolean>;

let accessChecker: AccessChecker = async () => false; // Default deny

export function setTenantAccessChecker(checker: AccessChecker) {
  accessChecker = checker;
}

export async function assertTenantAccess(userId: string, tenantId: string) {
  if (!userId || !tenantId) {
    throw new TenantRequiredError();
  }
  const allowed = await accessChecker(userId, tenantId);
  if (!allowed) {
    throw new PermissionDeniedError(`User ${userId} does not have access to tenant ${tenantId}`);
  }
}

export function withTenant<T>(tenantId: string, fn: (tenantId: string) => Promise<T>): Promise<T> {
  if (!tenantId) {
    throw new TenantRequiredError();
  }
  return fn(tenantId);
}

// Singleton pattern for Prisma
export function getPrismaSingleton<T>(factory: () => T): T {
  const globalForPrisma = global as unknown as { prisma: T };
  const prisma = globalForPrisma.prisma || factory();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
