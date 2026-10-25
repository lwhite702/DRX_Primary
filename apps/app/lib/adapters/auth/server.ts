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

export function hasClerkServerEnv() {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
      (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY),
  );
}

export function isNoClerkPreviewEnvironment() {
  return process.env.VERCEL_ENV === "preview" && !hasClerkServerEnv();
}

export function isTrueProductionEnvironment() {
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return false;
  }
  if (process.env.VERCEL_ENV === "production") {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

export function isClerkServerConfigured() {
  const configured = hasClerkServerEnv();
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (!configured && isTrueProductionEnvironment() && !isProductionBuild) {
    throw new Error("[auth] Clerk server and publishable keys are required in production.");
  }
  return configured;
}

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
  if (!isClerkServerConfigured()) {
    return getAnonymousAuthState() as never;
  }
  try {
    return await clerkAuth();
  } catch (error) {
    if (!isTrueProductionEnvironment()) {
      console.warn("[auth] clerkAuth failed; falling back to anonymous auth state", error);
      return getAnonymousAuthState() as never;
    }
    throw error;
  }
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
  if (!isClerkServerConfigured()) {
    return { userId: null, tenantId: null, roles: [] };
  }
  try {
    // Clerk v6 returns a richer auth object shape than the current @wrelik/auth type surface expects.
    return fromClerkAuth((await clerkAuth()) as never);
  } catch (error) {
    if (!isTrueProductionEnvironment()) {
      console.warn("[auth] getWorkflowSession failed; falling back to anonymous session", error);
      return { userId: null, tenantId: null, roles: [] };
    }
    throw error;
  }
}

export async function getWorkflowUserId(): Promise<string | null> {
  const session = await getWorkflowSession();
  return session.userId;
}
