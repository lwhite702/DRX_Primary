import { Metadata } from "next";
import { drxCopy } from "@/lib/copy/drx";
import { OnboardingForm } from "./_components/OnboardingForm";

export const metadata: Metadata = {
  title: "Onboarding | Deelrx CRM",
  description: "Complete onboarding to access DRX.",
};

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen bg-background px-6 py-14">
      <div className="noise-overlay" />
      <div className="ambient-glow left-[10%] top-[10%] h-72 w-72" />
      <div className="ambient-glow bottom-[8%] right-[8%] h-64 w-64" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <p className="technical-label mb-4 text-accent">{drxCopy.onboarding.page.label}</p>
        <h1 className="headline-text text-4xl text-white md:text-5xl">
          {drxCopy.onboarding.page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-text-secondary">{drxCopy.onboarding.page.body}</p>

        <OnboardingForm />
      </div>
    </main>
  );
}
