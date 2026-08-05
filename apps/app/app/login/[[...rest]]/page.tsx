import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignIn } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
<<<<<<< HEAD
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Clock, Database, Smartphone } from "lucide-react";
import { drxClerkAuthAppearance } from "@/lib/auth/clerk-appearance";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") ||
  "https://www.deelrxcrm.com";
=======
import { drxClerkAuthAppearance } from "@/components/auth/clerk-appearance";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";
import { authVisualFixturesEnabled } from "@/components/auth/visual-fixture-guard";
>>>>>>> origin/main

export const metadata: Metadata = {
  title: "Sign in | Deelrx CRM",
  description: "Sign in to your Deelrx CRM retail operations workspace.",
};

export default async function LoginPage() {
  const useVisualFixture = process.env.VISUAL_FIXTURES === "true";
  const userId = useVisualFixture ? null : (await auth()).userId;

  if (userId) redirect("/dashboard");

  return (
<<<<<<< HEAD
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
              Sign In
            </h1>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to access the operator console.
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
          {useVisualFixture ? (
            <AuthVisualFixture mode="sign-in" />
          ) : (
            <SignIn
              routing="path"
              path="/login"
              appearance={drxClerkAuthAppearance}
              forceRedirectUrl="/dashboard"
              fallbackRedirectUrl="/dashboard"
            />
          )}
        </div>

        <>
            <div className="text-center text-xs font-mono text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/waitlist"
                className="text-primary underline underline-offset-2 cursor-pointer hover:opacity-90"
              >
                Join beta waitlist
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
                      <h3 className="text-xs font-medium text-white">
                        Session Controls
                      </h3>
                      <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-primary font-mono">
                        GUARDED
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Authentication safeguards apply before workspace access
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
                        Role Checks
                      </h3>
                      <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-accent font-mono uppercase">
                        ENABLED
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Permissions are evaluated for protected operator routes.
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
                        Audit Context
                      </h3>
                      <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-primary font-mono">
                        CAPTURED
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Supported actions retain actor and business context.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Context */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-white">
                      Sign-in Protection
                    </h3>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Authentication, route, and authorization controls work
                      together before the operator console is available.
                    </p>
                  </div>

                  {/* Session Signal Summary */}
                  <div className="bg-black/40 rounded border border-white/5 p-3 space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">SESSION MODE</span>
                      <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        PROTECTED
                      </span>
                    </div>
                    <div className="h-px bg-white/5 my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Rotation</span>
                      <span className="text-white">Managed</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route Guards</span>
                      <span className="text-white">Configured</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audit Context</span>
                      <span className="text-white">Workflow-based</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Build Info */}
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
                DRX OPERATOR CONSOLE v2.4.1 <br />
                BUILD 20260131.0722
              </div>
            </div>
          </>
      </div>
    </div>
=======
    <AuthShell
      eyebrow="Operator access"
      description="Sign in to continue to your workspace."
      footer={
        <p className="text-center text-sm leading-6 text-[#B8B8B8]">
          New to Deelrx?{" "}
          <Link className="font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/waitlist">
            Join the beta
          </Link>
        </p>
      }
    >
      {authVisualFixturesEnabled ? (
        <AuthVisualFixture mode="sign-in" />
      ) : (
        <SignIn
          routing="path"
          path="/login"
          appearance={drxClerkAuthAppearance}
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />
      )}
    </AuthShell>
>>>>>>> origin/main
  );
}
