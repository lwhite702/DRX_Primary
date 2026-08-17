import React, { createContext, useContext } from "react";
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

type OperatorSession = {
  operatorId: string;
  displayName: string;
  businessId: string;
  businessName: string;
  roles: string[];
  permissions: string[];
  email: string | null;
};

interface AuthContextType {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  businessId: string | null;
  session: OperatorSession | null;
  onboardingStatus: "NEEDS_BUSINESS_ONBOARDING" | "READY" | "INACTIVE" | "BUSINESS_MISSING" | null;
  user: any;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, signOut, getToken, isLoaded } = useClerkAuth();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { user } = useUser();
  const { signIn: clerkSignIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const onboarding = useQuery(
    api.onboarding.getCurrentOnboardingStatus,
    isAuthenticated ? {} : "skip",
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
  const session = onboarding?.status === "READY" ? (onboarding.session as OperatorSession) : null;
  const onboardingStatus = onboarding?.status ?? null;
  const loading =
    !isLoaded ||
    isConvexLoading ||
    (!!isSignedIn && isAuthenticated && onboarding === undefined);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        userId: userId || null,
        getToken,
        signOut,
        businessId: session?.businessId ?? null,
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
