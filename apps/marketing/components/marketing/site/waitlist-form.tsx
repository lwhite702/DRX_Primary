"use client";

import { useState } from "react";
import { trackMarketingEvent } from "@/lib/analytics";

const defaultState = {
  email: "",
  businessName: "",
  role: "owner_operator",
  teamSize: "1-5",
  tooling: "",
};

export function WaitlistForm() {
  const [form, setForm] = useState(defaultState);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit application. Please try again.");
      }

      setSubmitted(true);
      trackMarketingEvent("submit_waitlist", {
        role: form.role,
        teamSize: form.teamSize,
        hasTooling: Boolean(form.tooling.trim()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-neon-lime/30 bg-neon-lime/10 p-6">
        <p className="text-lg font-semibold text-white">Request received.</p>
        <p className="mt-2 text-text-secondary">
          You are on the beta access list. We will follow up with next-step
          access details and current rollout timing.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <label className="grid gap-1 text-sm text-text-secondary">
        Email
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border border-border bg-black/30 px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-1 text-sm text-text-secondary">
        Business name
        <input
          required
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          className="rounded-lg border border-border bg-black/30 px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-1 text-sm text-text-secondary">
        Role
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="rounded-lg border border-border bg-black/30 px-3 py-2 text-white"
        >
          <option value="owner_operator">Owner/Operator</option>
          <option value="manager">Manager</option>
          <option value="multi_role">Multi-role Team Lead</option>
        </select>
      </label>

      <label className="grid gap-1 text-sm text-text-secondary">
        Team size
        <select
          value={form.teamSize}
          onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
          className="rounded-lg border border-border bg-black/30 px-3 py-2 text-white"
        >
          <option value="1-5">1-5</option>
          <option value="6-15">6-15</option>
          <option value="16-40">16-40</option>
          <option value="41+">41+</option>
        </select>
      </label>

      <label className="grid gap-1 text-sm text-text-secondary">
        Current tooling
        <textarea
          value={form.tooling}
          onChange={(e) => setForm({ ...form, tooling: e.target.value })}
          placeholder="How do you track sales, stock, and customers today?"
          className="min-h-28 rounded-lg border border-border bg-black/30 px-3 py-2 text-white"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-full bg-neon-lime px-5 py-2 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting application..." : "Join beta waitlist"}
      </button>
    </form>
  );
}
