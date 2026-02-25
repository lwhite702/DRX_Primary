"use client";

import React from "react";
import * as Clerk from "@clerk/nextjs";
import { isAuthBypassEnabledClient } from "@/lib/auth/bypass";

const authBypassEnabled = isAuthBypassEnabledClient();

const bypassUser = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Local",
  lastName: "Tester",
  fullName: "Local Tester",
  primaryEmailAddress: { emailAddress: "local@drx.test" },
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
          href="/dashboard"
          className="inline-flex items-center rounded-md bg-amber-300 px-3 py-2 text-xs font-bold text-black"
        >
          Continue to Dashboard
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

export function ClerkProvider(props: any) {
  if (authBypassEnabled) return <>{props.children}</>;
  return <Clerk.ClerkProvider {...props} />;
}

export function SignIn(props: any) {
  if (authBypassEnabled) return <BypassAuthCard mode="sign-in" />;
  return <Clerk.SignIn {...props} />;
}

export function SignUp(props: any) {
  if (authBypassEnabled) return <BypassAuthCard mode="sign-up" />;
  return <Clerk.SignUp {...props} />;
}

export function Waitlist(props: any) {
  if (authBypassEnabled) return <BypassAuthCard mode="waitlist" />;
  return <Clerk.Waitlist {...props} />;
}

export function useUser() {
  if (authBypassEnabled) {
    return {
      isLoaded: true,
      isSignedIn: true,
      user: bypassUser,
    } as any;
  }
  return Clerk.useUser();
}

export function useAuth() {
  if (authBypassEnabled) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: bypassUser.id,
      orgId: "org_local_bypass",
      sessionId: "bypass-session",
      getToken: async () => "bypass-token",
    } as any;
  }
  return Clerk.useAuth();
}

export function useSignIn() {
  if (authBypassEnabled) {
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
  return Clerk.useSignIn();
}

export function useOrganization() {
  if (authBypassEnabled) {
    return {
      isLoaded: true,
      organization: null,
    } as any;
  }
  return Clerk.useOrganization();
}

export function useOrganizationList(...args: any[]) {
  if (authBypassEnabled) {
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
  if (authBypassEnabled) {
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
  return <Clerk.OrganizationSwitcher {...props} />;
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
  if (authBypassEnabled) return <BypassSignOutButton {...props} />;
  return <Clerk.SignOutButton {...props} />;
}) as any;

const UserButtonImpl: any = (props: any) => {
  if (authBypassEnabled) {
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
  return <Clerk.UserButton {...props} />;
};

UserButtonImpl.MenuItems = (props: any) => {
  if (authBypassEnabled) return null;
  return <Clerk.UserButton.MenuItems {...props} />;
};

UserButtonImpl.Action = (props: any) => {
  if (authBypassEnabled) return null;
  return <Clerk.UserButton.Action {...props} />;
};

export const UserButton = UserButtonImpl as any;
