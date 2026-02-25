import { Waitlist } from "@/lib/adapters/auth/ui";
import { auth } from "@/lib/adapters/auth/server";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Join Beta Waitlist | Deelrx CRM",
  description:
    "Join the Deelrx CRM beta waitlist. Built for dispensaries all the way down to smaller operators.",
};

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") ||
  "https://deelrxcrm.com";

export default async function WaitlistPage() {
  const { userId, sessionClaims } = await auth();
  const claims = sessionClaims as {
    metadata?: { onboardingComplete?: boolean };
    publicMetadata?: { onboardingComplete?: boolean };
    public_metadata?: { onboardingComplete?: boolean };
  };
  const onboardingComplete =
    claims?.metadata?.onboardingComplete === true ||
    claims?.publicMetadata?.onboardingComplete === true ||
    claims?.public_metadata?.onboardingComplete === true;

  if (userId) {
    redirect(onboardingComplete ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] p-4">
      <div className="noise-overlay" />
      <div className="ambient-glow left-[15%] top-[12%] h-72 w-72" />
      <div className="ambient-glow bottom-[8%] right-[12%] h-64 w-64" />

      <div className="relative z-10 w-full max-w-[520px] space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-[170px]">
            <Image
              src="/brand/DRX Wordmark Color.svg"
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
            Deelrx CRM is built for dispensaries all the way down to smaller
            operators. Request access and we will notify you as invite waves
            open.
          </p>
        </div>

        <div className="glass-effect rounded-2xl border border-white/10 p-6">
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
        </div>

        <div className="text-center text-[11px] text-white/50">
          <Link href={`${marketingUrl}/legal/privacy`} className="hover:text-white">
            Privacy
          </Link>
          <span className="mx-2">•</span>
          <Link href={`${marketingUrl}/legal/terms`} className="hover:text-white">
            Terms
          </Link>
          <span className="mx-2">•</span>
          <Link href={`${marketingUrl}/beta`} className="hover:text-white">
            Beta details
          </Link>
        </div>
      </div>
    </div>
  );
}
