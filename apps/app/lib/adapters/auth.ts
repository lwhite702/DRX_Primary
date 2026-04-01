/**
 * Auth Adapter
 *
 * Provides lightweight auth/session helpers for app code.
 */

import type { WorkflowSession } from "@wrelik/auth/shared";
import { getWorkflowSession } from "@/lib/adapters/auth/server";

export type Session = WorkflowSession;
export type User = { id: string };

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getWorkflowSession();
  if (!session.userId) return null;
  return { id: session.userId };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const session = await getWorkflowSession();
  return session.userId ? session : null;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  // Sign-out flow is handled by Clerk UI/routes in this app.
  return;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

/**
 * Get user ID from session
 */
export async function getUserId(): Promise<string> {
  const session = await requireAuth();
  return session.userId as string;
}
