import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

interface AuthVisualFixtureProps {
  mode: "sign-in" | "sign-up" | "waitlist";
}

export function AuthVisualFixture({ mode }: AuthVisualFixtureProps) {
  const isSignUp = mode === "sign-up";
  const isWaitlist = mode === "waitlist";

  if (isWaitlist) return <LegacyWaitlistFixture />;

  return (
    <div
      className="w-full space-y-6"
      data-testid={`${mode}-visual-fixture`}
      role="group"
      aria-label={`${isWaitlist ? "Beta waitlist" : isSignUp ? "Create account" : "Sign in"} form preview`}
    >
      <header>
        <h1 className="text-[32px] font-bold leading-[1.2] tracking-[-0.04em] text-foreground">
          {isWaitlist ? "Join the beta" : isSignUp ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-[#B8B8B8]">
          {isWaitlist
            ? "Enter your email to request an invite."
            : isSignUp
              ? "Use your email to get started."
              : "Sign in to continue to your business."}
        </p>
      </header>

      <div className="space-y-2">
        <label htmlFor={`${mode}-email`} className="text-sm font-semibold leading-5 text-foreground">
          Email address
        </label>
        <input
          id={`${mode}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@business.com"
          className="min-h-[54px] w-full rounded-lg border border-[#555] bg-[#171717] px-3.5 text-[15px] text-foreground caret-accent placeholder:text-[#A3A3A3] hover:border-[#737373] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </div>

      {!isWaitlist ? (
        <div className="space-y-2">
          <label htmlFor={`${mode}-password`} className="text-sm font-semibold leading-5 text-foreground">
            Password
          </label>
          <input
            id={`${mode}-password`}
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder={isSignUp ? "Create a password" : "Enter your password"}
            className="min-h-[54px] w-full rounded-lg border border-[#555] bg-[#171717] px-3.5 text-[15px] text-foreground caret-accent placeholder:text-[#A3A3A3] hover:border-[#737373] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          {isSignUp ? (
            <p className="text-sm leading-5 text-[#A3A3A3]">Use a password you can remember.</p>
          ) : (
            <div className="flex justify-end">
              <Link
                href="/login/forgot-password"
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Forgot password?
              </Link>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="flex min-h-[54px] w-full items-center justify-center rounded-lg bg-accent px-4 text-[15px] font-bold text-[#0A0A0A] transition-colors hover:bg-[#D9FF4D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {isWaitlist ? "Request beta access" : isSignUp ? "Create account" : "Sign in"}
      </button>

      {!isWaitlist ? (
        <p className="flex min-h-11 items-center gap-2 text-sm leading-5 text-[#B8B8B8]">
          {isSignUp ? "Already have an account?" : "New to DRX?"}
          <Link
            href={isSignUp ? "/login" : "/register"}
            className="font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function LegacyWaitlistFixture() {
  return (
    <div
      className="space-y-5"
      data-testid="waitlist-visual-fixture"
      aria-label="Beta waitlist form preview"
    >
      <div>
        <h3 className="text-2xl font-bold tracking-[-0.025em] text-white">Join the beta</h3>
        <p className="mt-2 text-base leading-6 text-[#C7C7C7]">
          Enter your email to request an invite.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="waitlist-email" className="text-sm font-semibold text-[#E7E7E7]">
          Email address
        </label>
        <div className="flex min-h-12 items-center gap-3 rounded-lg border border-[#737373] bg-[#262626] px-3.5 transition-colors hover:border-[#8A8A8A] focus-within:border-accent focus-within:bg-[#2C2C2C] focus-within:ring-2 focus-within:ring-accent">
          <Mail className="size-4 text-white/50" aria-hidden />
          <input
            id="waitlist-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="operator@example.com"
            className="min-w-0 flex-1 bg-transparent text-base text-white caret-[#CCFF00] outline-none placeholder:text-[#B3B3B3]"
          />
        </div>
      </div>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-extrabold uppercase tracking-[0.06em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
      >
        Request beta access
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
