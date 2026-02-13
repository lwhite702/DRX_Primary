import { describe, it, expect } from 'vitest';
import { requireUser, fromClerkAuth } from './index';
import { AuthRequiredError } from '@wrelik/errors';

describe('@wrelik/auth', () => {
  it('should throw AuthRequiredError if user is null', () => {
    const session = { userId: null, tenantId: null, roles: [] };
    expect(() => requireUser(session)).toThrow(AuthRequiredError);
  });

  it('should return userId if session is valid', () => {
    const session = { userId: 'user_123', tenantId: null, roles: [] };
    expect(requireUser(session)).toBe('user_123');
  });

  it('should correctly parse Clerk auth object', () => {
    const clerkAuth = {
      userId: 'user_123',
      orgId: 'org_456',
      sessionClaims: { publicMetadata: { roles: ['admin'] } },
    } as any;

    const session = fromClerkAuth(clerkAuth);
    expect(session.userId).toBe('user_123');
    expect(session.tenantId).toBe('org_456');
    expect(session.roles).toContain('admin');
  });
});
