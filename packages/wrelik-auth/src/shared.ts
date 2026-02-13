import { AuthRequiredError, PermissionDeniedError, TenantRequiredError } from '@wrelik/errors';

export interface WorkflowSession {
  userId: string | null;
  tenantId: string | null;
  roles: string[];
}

export function requireUser(session: WorkflowSession | null): string {
  if (!session || !session.userId) {
    throw new AuthRequiredError();
  }
  return session.userId;
}

export function requireTenant(session: WorkflowSession | null): string {
  requireUser(session);
  if (!session || !session.tenantId) {
    throw new TenantRequiredError();
  }
  return session.tenantId;
}

export function hasRole(session: WorkflowSession | null, role: string): boolean {
  if (!session || !session.userId) return false;
  return session.roles.includes(role);
}

export function requireRole(session: WorkflowSession | null, role: string) {
  if (!hasRole(session, role)) {
    throw new PermissionDeniedError(`Role ${role} required`);
  }
}
