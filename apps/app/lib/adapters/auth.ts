/**
 * Auth Adapter
 *
 * Wraps @wrelik/auth and @wrelik/auth/next for Clerk integration
 */

import { auth } from "@wrelik/auth";
import type { User, Session } from "@wrelik/auth";

export { auth, User, Session };

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  return auth.getUser();
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  return auth.getSession();
}

/**
 * Sign out the current user
 */
export async function signOut() {
  return auth.signOut();
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth.getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

/**
 * Get user ID from session
 */
export async function getUserId(): Promise<string> {
  const session = await auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session.userId;
}
