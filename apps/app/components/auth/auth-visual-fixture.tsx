import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

interface AuthVisualFixtureProps {
  mode: "sign-in" | "sign-up" | "waitlist";
}

export function AuthVisualFixture({ mode }: AuthVisualFixtureProps) {
  const isSignUp = mode === "sign-up";
  const isWaitlist = mode === "waitlist";

  return (
    <div
      className="space-y-5"
      data-testid={`${mode}-visual-fixture`}
      aria-label={`${isWaitlist ? "Beta waitlist" : isSignUp ? "Registration" : "Sign in"} form preview`}
    >
      <div>
        <h3 className="text-2xl font-bold tracking-[-0.025em] text-white">
          {isWaitlist ? "Join the beta" : isSignUp ? "Create account" : "Sign in"}
        </h3>
        <p className="mt-2 text-base leading-6 text-[#C7C7C7]">
          {isWaitlist
            ? "Enter your email to request an invite."
            : isSignUp
              ? "Create your Deelrx operator account."
              : "Use your operator account to continue."}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${mode}-email`} className="text-sm font-semibold text-[#E7E7E7]">
          Email address
        </label>
        <div className="flex min-h-12 items-center gap-3 rounded-lg border border-white/15 bg-[#1A1A1A] px-3.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
          <Mail className="size-4 text-white/35" aria-hidden />
          <input
            id={`${mode}-email`}
            type="email"
            inputMode="email"
            placeholder="operator@example.com"
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#8A8A8A]"
          />
        </div>
      </div>

      {!isWaitlist ? (
        <div className="space-y-2">
          <label htmlFor={`${mode}-password`} className="text-sm font-semibold text-[#E7E7E7]">
            {isSignUp ? "Create password" : "Password"}
          </label>
          <div className="flex min-h-12 items-center gap-3 rounded-lg border border-white/15 bg-[#1A1A1A] px-3.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
            <LockKeyhole className="size-4 text-white/35" aria-hidden />
            <input
              id={`${mode}-password`}
              type="password"
              placeholder="••••••••••••"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#8A8A8A]"
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-extrabold uppercase tracking-[0.06em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
      >
        {isWaitlist ? "Request beta access" : isSignUp ? "Create account" : "Continue"}
        <ArrowRight className="size-4" aria-hidden />
      </button>

    </div>
  );
}
