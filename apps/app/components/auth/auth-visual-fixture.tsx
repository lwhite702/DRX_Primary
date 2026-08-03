import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

interface AuthVisualFixtureProps {
  mode: "sign-in" | "sign-up";
}

export function AuthVisualFixture({ mode }: AuthVisualFixtureProps) {
  const isSignUp = mode === "sign-up";

  return (
    <div
      className="space-y-5 px-6 pb-7 pt-4"
      data-testid={`${mode}-visual-fixture`}
      aria-label={`${isSignUp ? "Registration" : "Sign in"} form preview`}
    >
      <div className="space-y-2">
        <label htmlFor={`${mode}-email`} className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Email address
        </label>
        <div className="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-black/40 px-3">
          <Mail className="size-4 text-white/35" aria-hidden />
          <input
            id={`${mode}-email`}
            type="email"
            inputMode="email"
            placeholder="operator@example.com"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${mode}-password`} className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          {isSignUp ? "Create password" : "Password"}
        </label>
        <div className="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-black/40 px-3">
          <LockKeyhole className="size-4 text-white/35" aria-hidden />
          <input
            id={`${mode}-password`}
            type="password"
            placeholder="••••••••••••"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />
        </div>
      </div>

      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-extrabold uppercase tracking-[0.08em] text-black"
      >
        {isSignUp ? "Create operator account" : "Continue securely"}
        <ArrowRight className="size-4" aria-hidden />
      </button>

      <p className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
        Deterministic visual fixture · Clerk powers the live form
      </p>
    </div>
  );
}
