import { Metadata } from "next";

import { completeOnboarding } from "./_actions";

export const metadata: Metadata = {
  title: "Onboarding | Deelrx CRM",
  description: "Complete onboarding to access DRX.",
};

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen bg-[#050505] px-6 py-14">
      <div className="noise-overlay" />
      <div className="ambient-glow left-[10%] top-[10%] h-72 w-72" />
      <div className="ambient-glow bottom-[8%] right-[8%] h-64 w-64" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <p className="technical-label mb-4 text-[#BFFF00]">ONBOARDING</p>
        <h1 className="headline-text text-4xl text-white md:text-5xl">
          SET UP YOUR OPERATOR PROFILE
        </h1>
        <p className="mt-4 max-w-2xl text-text-secondary">
          This is required before dashboard access. It helps us stage rollout
          and tailor onboarding for your operation.
        </p>

        <form
          action={completeOnboarding}
          className="glass-effect mt-8 space-y-5 rounded-2xl border border-white/10 p-6"
        >
          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              BUSINESS NAME
            </span>
            <input
              name="businessName"
              required
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              ROLE
            </span>
            <select
              name="role"
              required
              defaultValue="owner_operator"
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            >
              <option value="owner_operator">Owner/Operator</option>
              <option value="manager">Manager</option>
              <option value="multi_role">Multi-role Team Lead</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              TEAM SIZE
            </span>
            <select
              name="teamSize"
              required
              defaultValue="1-5"
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            >
              <option value="1-5">1-5</option>
              <option value="6-15">6-15</option>
              <option value="16-40">16-40</option>
              <option value="41+">41+</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              CURRENT TOOLING (OPTIONAL)
            </span>
            <textarea
              name="tooling"
              rows={4}
              placeholder="POS, inventory, and customer tools you use today."
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </label>

          <button
            type="submit"
            className="laser-button mt-2 rounded-full bg-[#BFFF00] px-6 py-3 text-sm font-bold uppercase tracking-wide text-black"
          >
            Complete onboarding
          </button>
        </form>
      </div>
    </main>
  );
}
