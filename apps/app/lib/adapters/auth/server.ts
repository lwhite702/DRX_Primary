import {
  auth as clerkAuth,
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import type { WebhookEvent as ClerkWebhookEvent } from "@clerk/nextjs/server";
import type { WorkflowSession } from "@wrelik/auth/shared";
import {
  getBypassAuthOrgId,
  getBypassAuthUserId,
  isAuthBypassEnabledServer,
} from "@/lib/auth/bypass";

export { clerkClient, clerkMiddleware, createRouteMatcher };
export type WebhookEvent = ClerkWebhookEvent;
export const isAuthBypassEnabled = isAuthBypassEnabledServer;

const isClerkServerConfigured = Boolean(
  process.env.CLERK_SECRET_KEY &&
    (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY),
);

function fromClerkAuth(
  authState: Awaited<ReturnType<typeof clerkAuth>>,
): WorkflowSession {
  if (!authState?.userId) {
    return { userId: null, tenantId: null, roles: [] };
  }

  const roles = Array.isArray((authState.sessionClaims as any)?.publicMetadata?.roles)
    ? ((authState.sessionClaims as any).publicMetadata.roles as string[])
    : [];

  return {
    userId: authState.userId,
    tenantId: authState.orgId ?? null,
    roles,
  };
}

function getBypassAuthState() {
  return {
    userId: getBypassAuthUserId(),
    orgId: getBypassAuthOrgId(),
    sessionId: "bypass-session",
    sessionClaims: {
      metadata: { onboardingComplete: true },
      publicMetadata: { onboardingComplete: true },
      public_metadata: { onboardingComplete: true },
    },
    getToken: async () => "bypass-token",
    has: () => true,
  };
}

function getAnonymousAuthState() {
  return {
    userId: null,
    orgId: null,
    sessionId: null,
    sessionClaims: null,
    getToken: async () => null,
    has: () => false,
  };
}

// Transitional Clerk-compatible adapter surface for existing server code.
// New business logic should prefer workflow sessions over raw Clerk objects.
export async function auth() {
  if (isAuthBypassEnabled()) {
    return getBypassAuthState() as never;
  }
  if (!isClerkServerConfigured) {
    return getAnonymousAuthState() as never;
  }
  return clerkAuth();
}

export async function getWorkflowSession(): Promise<WorkflowSession> {
  if (isAuthBypassEnabled()) {
    return {
      userId: getBypassAuthUserId(),
      tenantId: getBypassAuthOrgId(),
      orgId: getBypassAuthOrgId(),
      roles: ["super_admin"],
      permissions: ["*"],
    } as WorkflowSession;
  }
  if (!isClerkServerConfigured) {
    return { userId: null, tenantId: null, roles: [] };
  }
  // Clerk v6 returns a richer auth object shape than the current @wrelik/auth type surface expects.
  return fromClerkAuth((await clerkAuth()) as never);
}

export async function getWorkflowUserId(): Promise<string | null> {
  const session = await getWorkflowSession();
  return session.userId;
}
