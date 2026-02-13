// src/index.ts
import { PermissionDeniedError, TenantRequiredError } from "@wrelik/errors";
var accessChecker = async () => false;
function setTenantAccessChecker(checker) {
  accessChecker = checker;
}
async function assertTenantAccess(userId, tenantId) {
  if (!userId || !tenantId) {
    throw new TenantRequiredError();
  }
  const allowed = await accessChecker(userId, tenantId);
  if (!allowed) {
    throw new PermissionDeniedError(`User ${userId} does not have access to tenant ${tenantId}`);
  }
}
function withTenant(tenantId, fn) {
  if (!tenantId) {
    throw new TenantRequiredError();
  }
  return fn(tenantId);
}
function getPrismaSingleton(factory) {
  const globalForPrisma = global;
  const prisma = globalForPrisma.prisma || factory();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  return prisma;
}
export {
  assertTenantAccess,
  getPrismaSingleton,
  setTenantAccessChecker,
  withTenant
};
