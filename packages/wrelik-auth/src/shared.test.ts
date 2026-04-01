import { describe, it, expect } from 'vitest';
import { requireUser, requireTenant, hasRole } from './shared';

describe('Auth Shared', () => {
  it('requireUser throws if no user', () => {
    expect(() => requireUser(null)).toThrow('Authentication required');
    expect(() => requireUser({ userId: null, tenantId: null, roles: [] })).toThrow(
      'Authentication required',
    );
  });

  it('requireUser returns userId', () => {
    expect(requireUser({ userId: 'u1', tenantId: null, roles: [] })).toBe('u1');
  });

  it('requireTenant throws if no tenant', () => {
    expect(() => requireTenant({ userId: 'u1', tenantId: null, roles: [] })).toThrow(
      'Tenant context required',
    );
  });

  it('hasRole checks roles', () => {
    const session = { userId: 'u1', tenantId: 't1', roles: ['admin'] };
    expect(hasRole(session, 'admin')).toBe(true);
    expect(hasRole(session, 'user')).toBe(false);
  });
});
