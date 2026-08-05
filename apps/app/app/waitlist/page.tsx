import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
<<<<<<< HEAD
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";

export const metadata: Metadata = {
  title: "Join Beta Waitlist | Deelrx CRM",
  description:
    "Join the Deelrx CRM beta waitlist. Built for independent retailers and owner-operated shops.",
};

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") ||
  "https://www.deelrxcrm.com";

=======
import { Waitlist } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { drxClerkWaitlistAppearance } from "@/components/auth/clerk-appearance";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthVisualFixture } from "@/components/auth/auth-visual-fixture";
import { authVisualFixturesEnabled } from "@/components/auth/visual-fixture-guard";

export const metadata: Metadata = {
  title: "Join the beta | Deelrx CRM",
  description: "Request access to Deelrx CRM for your independent retail operation.",
};

>>>>>>> origin/main
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
<<<<<<< HEAD
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] p-4">
      <div className="noise-overlay" />
      <div className="ambient-glow left-[15%] top-[12%] h-72 w-72" />
      <div className="ambient-glow bottom-[8%] right-[12%] h-64 w-64" />

      <div className="relative z-10 w-full max-w-[520px] space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-[170px]">
            <Image
              src="/brand/drx-wordmark.svg"
              alt="Deelrx CRM"
              width={170}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </div>
          <p className="technical-label text-neon-lime">BETA ACCESS</p>
          <h1 className="headline-text text-4xl text-white md:text-5xl">
            JOIN THE WAITLIST
          </h1>
          <p className="body-copy text-text-secondary">
            Deelrx CRM is built for independent retailers, owner-operated shops,
            pop-ups, and inventory-carrying service businesses. Request access
            and we will notify you as invite waves open.
          </p>
        </div>

        <div className="glass-effect rounded-2xl border border-white/10 p-6">
          {useVisualFixture ? (
            <AuthVisualFixture mode="sign-up" />
          ) : (
            <Waitlist
              afterJoinWaitlistUrl="/login"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full bg-transparent border-none shadow-none p-0",
                  card: "bg-transparent border-none shadow-none p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  formButtonPrimary:
                    "laser-button rounded-full bg-[#BFFF00] text-black font-bold uppercase tracking-wide h-11",
                  formFieldInput:
                    "bg-black/40 border border-white/10 text-white rounded-md",
                  formFieldLabel:
                    "technical-label text-[11px] text-white/60 uppercase tracking-[0.2em]",
                  footerActionLink:
                    "text-[#BFFF00] hover:text-[#BFFF00] underline-offset-4 hover:underline",
                },
              }}
            />
          )}
        </div>

        <div className="text-center text-[11px] text-white/50">
          <Link href={`${marketingUrl}/legal/privacy`} className="hover:text-white">
            Privacy
=======
    <AuthShell
      eyebrow="Beta access"
      description="Request access for your independent shop. We’ll email you when an invite is available."
      footer={
        <p className="text-center text-sm leading-6 text-[#B8B8B8]">
          Already have access?{" "}
          <Link className="font-semibold text-accent underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/login">
            Sign in
>>>>>>> origin/main
          </Link>
        </p>
      }
    >
      {authVisualFixturesEnabled ? (
        <AuthVisualFixture mode="waitlist" />
      ) : (
        <Waitlist
          afterJoinWaitlistUrl="/login"
          appearance={drxClerkWaitlistAppearance}
        />
      )}
    </AuthShell>
  );
}
