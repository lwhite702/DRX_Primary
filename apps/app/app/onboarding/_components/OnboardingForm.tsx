"use client";

import { useState } from "react";
import { completeOnboarding } from "../_actions";
import { drxCopy } from "@/lib/copy/drx";
import { ONBOARDING_COMPLETION_COOKIE } from "@/lib/auth/onboarding-completion";

export function OnboardingForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Set the onboarding completion cookie client-side immediately
      // to ensure the middleware sees it on the next client-side redirect fetch request.
      const isSecure = window.location.protocol === "https:";
      document.cookie = `${ONBOARDING_COMPLETION_COOKIE}=true; path=/; max-age=600; SameSite=Lax${
        isSecure ? "; Secure" : ""
      }`;

      // Set localStorage flag for layout state syncing
      window.localStorage.setItem("drx_onboarding_complete", "true");

      await completeOnboarding(formData);
    } catch (error) {
      console.error("Onboarding submission failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
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
        disabled={loading}
        className="laser-button mt-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : drxCopy.onboarding.page.submit}
      </button>
    </form>
  );
}
