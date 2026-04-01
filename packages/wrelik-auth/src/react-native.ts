import { type WorkflowSession } from './shared';

export * from './shared';

// We accept the `useAuth` or `useUser` return value or similar from Clerk Expo
// but to be loose coupling, we defined it as any with some shape checks if needed.
// However, the requirement says "converts the Clerk Expo session/user representation".
export function mapClerkToSession(
  auth: {
    userId?: string | null;
    orgId?: string | null;
    session?: { user?: { publicMetadata?: any } };
  } | null,
): WorkflowSession {
  if (!auth || !auth.userId) {
    return { userId: null, tenantId: null, roles: [] };
  }

  // The roles might be in publicMetadata of the user object in session
  const roles = (auth.session?.user?.publicMetadata?.roles as string[]) || [];

  return {
    userId: auth.userId,
    tenantId: auth.orgId || null,
    roles,
  };
}
