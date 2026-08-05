import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  ClerkProvider,
  toWorkflowSession,
  useClerkAuth,
  useSignIn,
  useUser,
} from "../adapters/auth/client";

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

interface AuthContextType {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  businessId: string | null;
  // Exposed from Clerk for compatibility
  user: any; // Type 'UserResource' from Clerk but 'any' avoids importing complex types for now if fine.
  // Actually let's use 'any' or just leave it generic. The error said 'Property user does not exist'.
  // Ideally, import { UserResource } from "@clerk/types";
  loading: boolean;
  signIn: any; // SignInResource
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, signOut, getToken, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const { signIn: clerkSignIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const [businessId, setBusinessId] = useState<string | null>(null);

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
  useEffect(() => {
    if (isSignedIn && userId) {
      // In a real implementation, you might fetch this from your API
      // or derive it from the user's public metadata if you sync it there.
      // For now, let's try to fetch it from the API or user metadata.
      const fetchBusiness = async () => {
        try {
          const token = await getToken();
          const workflowSession = toWorkflowSession({
            userId,
            orgId: null,
            session: { user: user ? { publicMetadata: user.publicMetadata } : undefined },
          });
          // We can't call the API yet because we haven't refactored the API client.
          // But we can check user public metadata if available.
          const metadata = user?.publicMetadata as any;
          if (metadata?.businessId) {
            setBusinessId(metadata.businessId);
          } else if (workflowSession.tenantId) {
            setBusinessId(workflowSession.tenantId);
          }
        } catch (e) {
          console.error("Failed to fetch business ID", e);
        }
      };

      fetchBusiness();
    } else {
      setBusinessId(null);
    }
  }, [isSignedIn, userId, user]);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        userId: userId || null,
        getToken,
        signOut,
        businessId,
        user,
        loading: !isLoaded,
        signIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
    return null;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <AuthProviderInner>{children}</AuthProviderInner>
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
