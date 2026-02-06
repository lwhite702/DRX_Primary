"use client";

/**
 * TESTING ONLY: Mock Clerk hooks for bypassing auth in development
 *
 * When NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING=true, this file exports mock
 * implementations of Clerk hooks that return fake authenticated state.
 *
 * Replace all imports from "@clerk/nextjs" with "@/lib/clerk" in components.
 */

import {
  ClerkProvider as RealClerkProvider,
  useAuth as realUseAuth,
  useUser as realUseUser,
  useOrganization as realUseOrganization,
  useSession as realUseSession,
  useClerk as realUseClerk,
} from "@clerk/nextjs";

const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";

if (bypassAuth && typeof window !== "undefined") {
  console.log("🧪 Clerk bypass active - using mock auth state");
}

// Mock data
const mockUser = {
  id: "test_user_123",
  primaryEmailAddress: { emailAddress: "test@deelrxcrm.com" },
  emailAddresses: [{ emailAddress: "test@deelrxcrm.com", id: "email_123" }],
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  username: "testuser",
  imageUrl: "/brand/favicon-32.png",
  publicMetadata: {},
  unsafeMetadata: {},
};

const mockAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: "test_user_123",
  sessionId: "test_session_123",
  orgId: null,
  orgRole: null,
  orgSlug: null,
  actor: null,
  getToken: async () => "mock_token",
  signOut: async () => {},
  has: () => true,
};

// Export mocked or real hooks
export function useAuth() {
  if (bypassAuth) return mockAuth;
  return realUseAuth();
}

export function useUser() {
  if (bypassAuth) return { isLoaded: true, isSignedIn: true, user: mockUser };
  return realUseUser();
}

export function useOrganization() {
  if (bypassAuth) return { isLoaded: true, organization: null };
  return realUseOrganization();
}

export function useSession() {
  if (bypassAuth)
    return { isLoaded: true, session: { id: "test_session_123" } };
  return realUseSession();
}

export function useClerk() {
  if (bypassAuth)
    return {
      signOut: async () => {},
      openSignIn: () => {},
      openSignUp: () => {},
      openUserProfile: () => {},
    };
  return realUseClerk();
}

// Export ClerkProvider (mocked or real)
export function ClerkProvider({ children, ...props }: any) {
  if (bypassAuth) {
    // Just render children without Clerk provider
    return <>{children}</>;
  }
  return <RealClerkProvider {...props}>{children}</RealClerkProvider>;
}

// Re-export other Clerk components as-is
export * from "@clerk/nextjs";
