import { Metadata } from "next";

import { completeOnboarding } from "./_actions";
import { drxCopy } from "@/lib/copy/drx";

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
        <p className="technical-label mb-4 text-[#BFFF00]">{drxCopy.onboarding.page.label}</p>
        <h1 className="headline-text text-4xl text-white md:text-5xl">
          {drxCopy.onboarding.page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-text-secondary">{drxCopy.onboarding.page.body}</p>

        <form
          action={completeOnboarding}
          className="glass-effect mt-8 space-y-5 rounded-2xl border border-white/10 p-6"
        >
          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              {drxCopy.onboarding.page.businessName}
            </span>
            <input
              name="businessName"
              required
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              {drxCopy.onboarding.page.role}
            </span>
            <select
              name="role"
              required
              defaultValue="owner_operator"
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            >
              <option value="owner_operator">Owner / operator</option>
              <option value="manager">Manager</option>
              <option value="multi_role">Team lead</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              {drxCopy.onboarding.page.teamSize}
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
            <span className="technical-label text-[11px] text-white/80">
              Dashboard View
            </span>
            <select
              name="dashboardPreset"
              defaultValue="operations"
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            >
              <option value="operations">Operations (balanced daily overview)</option>
              <option value="checkout">Checkout (front-counter workflow)</option>
              <option value="inventory">Inventory (stock and replenishment focus)</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="technical-label text-[11px] text-white/70">
              {drxCopy.onboarding.page.tooling}
            </span>
            <textarea
              name="tooling"
              rows={4}
              placeholder={drxCopy.onboarding.page.toolingPlaceholder}
              className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </label>

          <button
            type="submit"
            className="laser-button mt-2 rounded-full bg-[#BFFF00] px-6 py-3 text-sm font-bold uppercase tracking-wide text-black"
          >
            {drxCopy.onboarding.page.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
