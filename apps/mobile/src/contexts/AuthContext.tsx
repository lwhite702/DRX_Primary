import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { api } from "@drx-convex/_generated/api";
import {
  ClerkProvider,
  useClerkAuth,
  useSignIn,
  useUser,
} from "../adapters/auth/client";
import { selectOperatorSession, type OperatorSession } from "../lib/operatorSession";
import { unregisterPushBeforeSignOut } from "../lib/pushNotifications";

const OPERATOR_SESSION_KEY_PREFIX = "drx.operator-session.v1";

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL!;
const convex = CONVEX_URL
  ? new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false })
  : null;

interface AuthContextType {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  businessId: string | null;
  legacyBusinessId: string | null;
  session: OperatorSession | null;
  onboardingStatus: "NEEDS_BUSINESS_ONBOARDING" | "READY" | "INACTIVE" | "BUSINESS_MISSING" | null;
  user: any;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, signOut: clerkSignOut, getToken, isLoaded } = useClerkAuth();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { user } = useUser();
  const { signIn: clerkSignIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const [cachedSession, setCachedSession] = useState<OperatorSession | null>(null);
  const [cacheUserId, setCacheUserId] = useState<string | null>(null);
  const signOut = async () => {
    await unregisterPushBeforeSignOut();
    await clerkSignOut();
  };
  const onboarding = useQuery(
    api.onboarding.getCurrentOnboardingStatus,
    isAuthenticated && userId ? { expectedUserId: userId } : "skip",
  );

  const signIn = async (email?: string, password?: string) => {
    if (!isSignInLoaded || !clerkSignIn) {
      return { error: new Error("Auth is still loading") };
    }
    try {
      const result = await clerkSignIn.create({
        identifier: email || "",
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return { error: null };
      } else {
        return { error: new Error("Sign in requires further verification") };
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || err.message || "Failed to sign in";
      return { error: new Error(msg) };
    }
  };
  const liveSession = onboarding?.status === "READY" ? (onboarding.session as OperatorSession) : null;

  useEffect(() => {
    let active = true;
    if (!isLoaded) return () => { active = false; };
    if (!isSignedIn || !userId) {
      setCachedSession(null);
      setCacheUserId(null);
      return () => { active = false; };
    }
    const key = `${OPERATOR_SESSION_KEY_PREFIX}.${userId}`;
    void SecureStore.getItemAsync(key).then((value) => {
      if (!active) return;
      try {
        const parsed = value ? (JSON.parse(value) as OperatorSession) : null;
        setCachedSession(parsed?.operatorId === userId ? parsed : null);
      } catch {
        setCachedSession(null);
        void SecureStore.deleteItemAsync(key);
      } finally {
        setCacheUserId(userId);
      }
    });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!liveSession || !userId || liveSession.operatorId !== userId) return;
    let active = true;
    const persist = async () => {
      const next: OperatorSession = { ...liveSession };
      if (!active) return;
      setCachedSession(next);
      setCacheUserId(userId);
      await SecureStore.setItemAsync(
        `${OPERATOR_SESSION_KEY_PREFIX}.${userId}`,
        JSON.stringify(next),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
      );
    };
    void persist();
    return () => { active = false; };
  }, [liveSession, userId]);

  const session = selectOperatorSession({ userId, isSignedIn, liveSession, cachedSession, hasLiveStatus: onboarding !== undefined });
  const onboardingStatus = onboarding?.status ?? (session ? "READY" : null);
  const cacheHydrated = !isSignedIn || (!!userId && cacheUserId === userId);
  const loading =
    !isLoaded ||
    !cacheHydrated ||
    ((isConvexLoading || (!!isSignedIn && isAuthenticated && onboarding === undefined)) && !session);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        userId: userId || null,
        getToken,
        signOut,
        businessId: session?.businessId ?? null,
        legacyBusinessId: session?.legacyBusinessId ?? null,
        session,
        onboardingStatus,
        user,
        loading,
        signIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY || !convex) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY or EXPO_PUBLIC_CONVEX_URL");
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <AuthProviderInner>{children}</AuthProviderInner>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // If used outside of our wrapper, try to fallback to Clerk's useAuth directly
    // but that won't have businessId. Better to enforce usage within provider.
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
