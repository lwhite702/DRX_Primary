import {
  auth as clerkAuth,
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import type { WebhookEvent as ClerkWebhookEvent } from "@clerk/nextjs/server";
import { fromClerkAuth } from "@wrelik/auth/server";
import type { WorkflowSession } from "@wrelik/auth/shared";
import {
  BYPASS_AUTH_ORG_ID,
  BYPASS_AUTH_USER_ID,
  isAuthBypassEnabledServer,
} from "@/lib/auth/bypass";

export { clerkClient, clerkMiddleware, createRouteMatcher };
export type WebhookEvent = ClerkWebhookEvent;
export const isAuthBypassEnabled = isAuthBypassEnabledServer;

function getBypassAuthState() {
  return {
    userId: BYPASS_AUTH_USER_ID,
    orgId: BYPASS_AUTH_ORG_ID,
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

// Transitional Clerk-compatible adapter surface for existing server code.
// New business logic should prefer workflow sessions over raw Clerk objects.
export async function auth() {
  if (isAuthBypassEnabled()) {
    return getBypassAuthState() as never;
  }
  return clerkAuth();
}

export async function getWorkflowSession(): Promise<WorkflowSession> {
  if (isAuthBypassEnabled()) {
    return {
      userId: BYPASS_AUTH_USER_ID,
      tenantId: BYPASS_AUTH_ORG_ID,
      orgId: BYPASS_AUTH_ORG_ID,
      roles: ["super_admin"],
      permissions: ["*"],
    } as WorkflowSession;
  }
  // Clerk v6 returns a richer auth object shape than the current @wrelik/auth type surface expects.
  return fromClerkAuth((await clerkAuth()) as never);
}

export async function getWorkflowUserId(): Promise<string | null> {
  const session = await getWorkflowSession();
  return session.userId;
}
