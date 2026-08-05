import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUp } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { drxClerkAuthAppearance } from "@/components/auth/clerk-appearance";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";

export const metadata: Metadata = {
  title: "Create an account | Deelrx CRM",
  description: "Create your Deelrx CRM retail operations workspace.",
};

export default async function RegisterPage() {
  const useVisualFixture =
    process.env.NODE_ENV !== "production" && process.env.VISUAL_FIXTURES === "true";
  const { userId } = await auth();

  if (userId) redirect("/dashboard");

  return (
    <AuthShell
      eyebrow="Create your workspace"
      description="Set up your operator account, then add your business details."
      footer={
        <p className="text-center text-sm leading-6 text-[#B8B8B8]">
          Already have an account?{" "}
          <Link className="font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      {useVisualFixture ? (
        <AuthVisualFixture mode="sign-up" />
      ) : (
        <SignUp
          routing="path"
          path="/register"
          appearance={drxClerkAuthAppearance}
          forceRedirectUrl="/onboarding"
          fallbackRedirectUrl="/onboarding"
        />
      )}
    </AuthShell>
  );
}
