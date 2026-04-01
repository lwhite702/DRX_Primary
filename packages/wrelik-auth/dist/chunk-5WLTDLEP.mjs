// src/shared.ts
import { AuthRequiredError, PermissionDeniedError, TenantRequiredError } from "@wrelik/errors";
function requireUser(session) {
  if (!session || !session.userId) {
    throw new AuthRequiredError();
  }
  return session.userId;
}
function requireTenant(session) {
  requireUser(session);
  if (!session || !session.tenantId) {
    throw new TenantRequiredError();
  }
  return session.tenantId;
}
function hasRole(session, role) {
  if (!session || !session.userId) return false;
  return session.roles.includes(role);
}
function requireRole(session, role) {
  if (!hasRole(session, role)) {
    throw new PermissionDeniedError(`Role ${role} required`);
  }
}

export {
  requireUser,
  requireTenant,
  hasRole,
  requireRole
};
