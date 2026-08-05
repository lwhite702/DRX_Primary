"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth, useIsBypassActive } from "@/lib/adapters/auth/ui";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function useConvexAuth() {
  const authState = useAuth();
  const isBypassActive = useIsBypassActive();

  if (isBypassActive) {
    return {
      ...authState,
      isLoaded: true,
      isSignedIn: false,
      getToken: async () => null,
    };
  }

  return authState;
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!convex) return <>{children}</>;

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useConvexAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
