import { SignUp } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Clock, Database } from "lucide-react";
import { drxClerkAuthAppearance } from "@/lib/auth/clerk-appearance";

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") ||
  "https://deelrxcrm.com";

export const metadata: Metadata = {
  title: "Register | Deelrx CRM",
  description: "Create your secure workspace.",
};

export default async function RegisterPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-gray-400">
      {/* Background Noise/Grid */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] space-y-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-12 w-[160px]">
            <Image
              src="/brand/drx-wordmark.svg"
              alt="Deelrx CRM"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              Deelrx CRM Operator Console
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
              Initialize Session
            </h1>
            <p className="text-xs text-muted-foreground">
              Create your operator credentials to access beta workflows and
              onboarding.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-1 shadow-2xl overflow-hidden">
          {/* System Status Badge */}
          <div className="px-6 pt-6 pb-2 flex justify-between items-center">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] text-primary uppercase font-mono tracking-wider">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              System Online
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Encrypted
            </div>
          </div>

          <SignUp
            routing="path"
            path="/register"
            appearance={drxClerkAuthAppearance}
            forceRedirectUrl="/onboarding"
            fallbackRedirectUrl="/onboarding"
          />
        </div>

        <div className="text-center text-xs font-mono text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary underline underline-offset-2 hover:opacity-90"
          >
            Back to Sign In
          </Link>
        </div>

        {/* Security Info Card */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 space-y-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Session Security
          </div>

          <div className="space-y-4">
            {/* Item 1 */}
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 p-1.5 rounded bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-white">Auto-Wipe</h3>
                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-primary font-mono">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Local cache cleared on exit
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 p-1.5 rounded bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-white">
                    Session Guards
                  </h3>
                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-accent font-mono uppercase">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Role checks and session controls are enforced on sign-up.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 p-1.5 rounded bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-white">
                    No-Log Policy
                  </h3>
                  <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-primary font-mono">
                    ENFORCED
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Audit context available in operator workflows
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Header/Footer Build Info - kept similar to login */}
        <div className="pt-8 pb-4 text-center space-y-4">
          <div className="flex justify-center gap-4 text-[10px] text-muted-foreground/60 font-mono">
            <Link
              href={`${marketingUrl}/legal/privacy`}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link
              href={`${marketingUrl}/legal/terms`}
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <span>•</span>
            <Link
              href={`${marketingUrl}/beta`}
              className="hover:text-white transition-colors"
            >
              Beta details
            </Link>
          </div>

          <div className="text-[9px] text-muted-foreground/40 font-mono uppercase tracking-widest">
            © 2026 Deelrx CRM
          </div>

          <div className="flex justify-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5">
              <div className="w-1 h-1 bg-primary rounded-full" />
              <span className="text-[9px] font-mono text-primary font-bold">
                WAITLIST ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/5">
              <div className="w-1 h-1 bg-white/50 rounded-full" />
              <span className="text-[9px] font-mono text-white/50">
                BETA ACCESS
              </span>
            </div>
          </div>

          <div className="text-[8px] text-muted-foreground/30 font-mono uppercase">
            DRX OPERATOR CONSOLE <br />
            BETA ACCESS
          </div>
        </div>
      </div>
    </div>
  );
}
