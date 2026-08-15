"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/adapters/auth/ui";

export function LoginRedirectBridge({ target = "/pos/sale" }: { target?: string }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    if (window.location.pathname !== target) {
      window.location.assign(target);
    }
  }, [isLoaded, isSignedIn, target]);

  return null;
}
