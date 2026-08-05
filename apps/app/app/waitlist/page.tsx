import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Waitlist } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { drxClerkAuthAppearance } from "@/lib/adapters/auth/appearance";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";

export const metadata: Metadata = {
  title: "Join the beta | Deelrx CRM",
  description: "Request access to Deelrx CRM for your independent retail operation.",
};

export default async function WaitlistPage() {
  const useVisualFixture = process.env.VISUAL_FIXTURES === "true";
  const { userId, sessionClaims } = useVisualFixture
    ? { userId: null, sessionClaims: null }
    : await auth();
  const claims = sessionClaims as {
    metadata?: { onboardingComplete?: boolean };
    publicMetadata?: { onboardingComplete?: boolean };
    public_metadata?: { onboardingComplete?: boolean };
  };
  const onboardingComplete =
    claims?.metadata?.onboardingComplete === true ||
    claims?.publicMetadata?.onboardingComplete === true ||
    claims?.public_metadata?.onboardingComplete === true;

  if (userId) redirect(onboardingComplete ? "/dashboard" : "/onboarding");

  return (
    <AuthShell
      eyebrow="Beta access"
      description="Request access for your independent shop. We’ll email you when an invite is available."
      footer={
        <p className="text-center text-sm leading-6 text-[#B8B8B8]">
          Already have access?{" "}
          <Link className="font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      {useVisualFixture ? (
        <AuthVisualFixture mode="waitlist" />
      ) : (
        <Waitlist
          afterJoinWaitlistUrl="/login"
          appearance={drxClerkAuthAppearance}
        />
      )}
    </AuthShell>
  );
}
