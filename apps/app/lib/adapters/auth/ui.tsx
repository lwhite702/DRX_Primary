"use client";

import React from "react";
import dynamic from "next/dynamic";
import * as Clerk from "@clerk/nextjs";

const LazyClerkProvider = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.ClerkProvider),
  { ssr: false }
);

const LazySignIn = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignIn),
  { ssr: false }
);

const LazySignUp = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignUp),
  { ssr: false }
);

const LazyWaitlist = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.Waitlist),
  { ssr: false }
);

const LazyOrganizationSwitcher = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.OrganizationSwitcher),
  { ssr: false }
);

const LazySignOutButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignOutButton),
  { ssr: false }
);

const LazyUserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);
import { createContext, useContext } from "react";

export const BypassContext = createContext<{
  isBypassActive: boolean;
  bypassUserId?: string;
  bypassOrgId?: string;
}>({ isBypassActive: false });

export function useIsBypassActive() {
  return useContext(BypassContext).isBypassActive;
}

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const shouldStubClerkGlobal = !clerkConfigured;

const unauthenticatedState = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
};

function BypassAuthCard({ mode }: { mode: "sign-in" | "sign-up" | "waitlist" }) {
  const title =
    mode === "sign-up" ? "Auth Bypass Enabled (Sign Up Disabled)" :
    mode === "waitlist" ? "Auth Bypass Enabled" :
    "Auth Bypass Enabled (Sign In Disabled)";

	    return (
	    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-amber-50/90">
        Local testing bypass is enabled. Clerk auth UI is skipped so you can test app flows.
      </p>
      <div className="mt-4 flex gap-2">
        <a
          href="/pos/sale"
          className="inline-flex items-center rounded-md bg-amber-300 px-3 py-2 text-xs font-bold text-black"
        >
          Continue to workspace
        </a>
        <a
          href="/pos/sale"
          className="inline-flex items-center rounded-md border border-amber-200/40 px-3 py-2 text-xs font-bold text-amber-50"
        >
          Open Quick Sale
        </a>
      </div>
    </div>
  );
}

export function ClerkProvider({ isBypassActive = false, bypassUserId, bypassOrgId, children, ...props }: any) {
  const active = isBypassActive || (typeof window !== "undefined" && (window as any).__BYPASS_ACTIVE__);

  if (typeof window !== "undefined" && isBypassActive) {
    (window as any).__BYPASS_ACTIVE__ = true;
    (window as any).__BYPASS_USER_ID__ = bypassUserId;
    (window as any).__BYPASS_ORG_ID__ = bypassOrgId;
  }

  const userId = bypassUserId || (typeof window !== "undefined" ? (window as any).__BYPASS_USER_ID__ : undefined);
  const orgId = bypassOrgId || (typeof window !== "undefined" ? (window as any).__BYPASS_ORG_ID__ : undefined);

  const shouldStub = active || shouldStubClerkGlobal;

  return (
    <BypassContext.Provider value={{ isBypassActive: active, bypassUserId: userId, bypassOrgId: orgId }}>
      {shouldStub ? <>{children}</> : <LazyClerkProvider {...props}>{children}</LazyClerkProvider>}
    </BypassContext.Provider>
  );
}

export function SignIn(props: any) {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) return <BypassAuthCard mode="sign-in" />;
  return <LazySignIn {...props} />;
}

export function SignUp(props: any) {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) return <BypassAuthCard mode="sign-up" />;
  return <LazySignUp {...props} />;
}

export function Waitlist(props: any) {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) return <BypassAuthCard mode="waitlist" />;
  return <LazyWaitlist {...props} />;
}

export function useUser() {
  const { isBypassActive, bypassUserId } = useContext(BypassContext);
  if (isBypassActive) {
    return {
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: bypassUserId || "default-bypass-id",
        firstName: "Local",
        lastName: "Tester",
        fullName: "Local Tester",
        primaryEmailAddress: { emailAddress: "local@drx.test" },
      },
    } as any;
  }
  if (!clerkConfigured) {
    return unauthenticatedState as any;
  }
  return Clerk.useUser();
}

export function useAuth() {
  const { isBypassActive, bypassUserId, bypassOrgId } = useContext(BypassContext);
  if (isBypassActive) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: bypassUserId || "default-bypass-id",
      orgId: bypassOrgId || "org_local_bypass",
      sessionId: "bypass-session",
      getToken: async () => "bypass-token",
    } as any;
  }
  if (!clerkConfigured) {
    return {
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      orgId: null,
      sessionId: null,
      getToken: async () => null,
    } as any;
  }
  return Clerk.useAuth();
}

export function useSignIn() {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive) {
    return {
      isLoaded: true,
      signIn: {
        create: async () => ({
          status: "complete",
          createdSessionId: "bypass-session",
        }),
      },
      setActive: async () => undefined,
    } as any;
  }
  if (!clerkConfigured) {
    return {
      isLoaded: true,
      signIn: null,
      setActive: async () => undefined,
    } as any;
  }
  return Clerk.useSignIn();
}

export function useOrganization() {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive) {
    return {
      isLoaded: true,
      organization: null,
    } as any;
  }
  if (!clerkConfigured) {
    return {
      isLoaded: true,
      organization: null,
    } as any;
  }
  return Clerk.useOrganization();
}

export function useOrganizationList(...args: any[]) {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) {
    void args;
    return {
      isLoaded: true,
      userMemberships: { data: [] },
      setActive: async () => undefined,
    } as any;
  }
  return (Clerk.useOrganizationList as any)(...args);
}

export const OrganizationSwitcher = ((props: any) => {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) {
    return (
      <button
        type="button"
        className="border border-white/10 px-4 py-2 rounded-md text-white/80 text-sm"
        title="Local auth bypass mode"
      >
        Local Workspace
      </button>
    );
  }
  return <LazyOrganizationSwitcher {...props} />;
}) as any;

function BypassSignOutButton({ children, redirectUrl, afterSignOutUrl }: any) {
  const href = redirectUrl || afterSignOutUrl || "/login";
  if (!children) {
    return (
      <a href={href} className="inline-flex items-center gap-2">
        Sign out
      </a>
    );
  }

  if (React.isValidElement(children)) {
    const child: any = children;
    return React.cloneElement(child, {
      ...child.props,
      onClick: (e: any) => {
        child.props?.onClick?.(e);
        if (typeof window !== "undefined") {
          window.location.href = href;
        }
      },
    });
  }

  return <>{children}</>;
}

export const SignOutButton = ((props: any) => {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) return <BypassSignOutButton {...props} />;
  return <LazySignOutButton {...props} />;
}) as any;

const UserButtonImpl: any = (props: any) => {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) {
    return (
      <button
        type="button"
        aria-label="User menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-white"
        title="Local Tester"
      >
        LT
      </button>
    );
  }
  return <LazyUserButton {...props} />;
};

UserButtonImpl.MenuItems = (props: any) => {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) return null;
  return <Clerk.UserButton.MenuItems {...props} />;
};

UserButtonImpl.Action = (props: any) => {
  const isBypassActive = useIsBypassActive();
  if (isBypassActive || shouldStubClerkGlobal) return null;
  return <Clerk.UserButton.Action {...props} />;
};

export const UserButton = UserButtonImpl as any;
