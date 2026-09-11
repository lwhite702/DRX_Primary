"use client";
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useBusiness } from "@/lib/hooks/use-business";
import { useAuth } from "@/lib/adapters/auth/ui";
import { formatAmount, formatCount, formatPercentage } from "@/lib/number-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const settingsSchema = z.object({ businessId: z.string().min(1), enabled: z.boolean(), maxCustomerCents: integer, inventoryCapBps: integer.max(10000), newCustomerCents: integer, autoRefreshDays: integer.min(1).refine(value => Number.isSafeInteger(value * 86400000)), revision: integer.min(1) });
type Settings = z.infer<typeof settingsSchema>;
type Fields = Pick<Settings, "enabled" | "maxCustomerCents" | "inventoryCapBps" | "newCustomerCents" | "autoRefreshDays">;
type Attempt = Fields & { business_id: string; expectedUserId: string; expectedRevision: number | null; requestKey: string };
const endpoint = "/api/credit/recommendation-settings";
function exactHundredths(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}
function hundredthsInput(value: number) {
  const digits = String(value).padStart(3, "0");
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
function displayMoneyCents(value: number) {
  const formatted = formatAmount(value / 100);
  return exactHundredths(formatted) === value ? formatted : hundredthsInput(value);
}
function failure(status?: number) {
  return status === 403 ? "You do not have permission to manage credit recommendation settings." : status === 401 ? "Sign in again to manage credit recommendation settings." : status === 409 ? "Settings changed or require reconciliation. Refresh the saved settings before continuing." : "Credit recommendation settings are temporarily unavailable.";
}
export default function CreditRecommendationSettingsPage() {
  const { business, loading } = useBusiness();
  const { userId } = useAuth();
  if (loading) return <p role="status" className="p-6">Loading business…</p>;
  if (!business || !userId) return <p role="status" className="p-6">Select a business and sign in to manage credit recommendation settings.</p>;
  return <SettingsEditor key={JSON.stringify([business.id, userId])} businessId={business.id} userId={userId} />;
}
function SettingsEditor({ businessId, userId }: { businessId: string; userId: string }) {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [maximum, setMaximum] = useState("");
  const [cap, setCap] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [days, setDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  const mounted = useRef(false), busy = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const populate = (value: Settings | null) => {
    setEnabled(value?.enabled ?? false);
    setMaximum(value ? hundredthsInput(value.maxCustomerCents) : "");
    // Keep exact basis points in editable input; summaries use one decimal place.
    setCap(value ? hundredthsInput(value.inventoryCapBps) : "");
    setNewCustomer(value ? hundredthsInput(value.newCustomerCents) : "");
    setDays(value ? String(value.autoRefreshDays) : "");
  };
  const load = async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(null); setNotice(null);
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const params = new URLSearchParams({ business_id: businessId, expectedUserId: userId });
      const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal, cache: "no-store", credentials: "same-origin" });
      if (!mounted.current || controller.signal.aborted) return;
      if (!response.ok) { if (response.status === 401 || response.status === 403) setDenied(true); setError(failure(response.status)); return; }
      const result = z.object({ settings: settingsSchema.nullable() }).safeParse(await response.json());
      if (!mounted.current || controller.signal.aborted) return;
      if (!result.success || (result.data.settings && result.data.settings.businessId !== businessId)) { setError("The saved settings response could not be verified."); return; }
      setSaved(result.data.settings); setLoaded(true); setDenied(false);
      if (!attempt.current) populate(result.data.settings);
    } catch { if (mounted.current && !controller.signal.aborted) setError(failure()); }
    finally { controllers.current.delete(controller); if (mounted.current && !controller.signal.aborted) { busy.current = false; setLoading(false); } }
  };
  useEffect(() => {
    mounted.current = true; void load();
    return () => { mounted.current = false; for (const controller of controllers.current) controller.abort(); busy.current = false; };
    // Scope changes remount this editor and abort every old request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (busy.current || !loaded) return;
    if (!attempt.current) {
      const maxCustomerCents = exactHundredths(maximum), newCustomerCents = exactHundredths(newCustomer), inventoryCapBps = exactHundredths(cap);
      const autoRefreshDays = /^\d+$/.test(days.trim()) ? Number(days.trim()) : NaN;
      if (maxCustomerCents === null || newCustomerCents === null || inventoryCapBps === null || inventoryCapBps > 10000 || !Number.isSafeInteger(autoRefreshDays) || autoRefreshDays < 1 || !Number.isSafeInteger(autoRefreshDays * 86400000)) { setError("Enter nonnegative amounts with at most two decimals, a percentage from 0 to 100, and a positive whole number of days."); return; }
      attempt.current = { business_id: businessId, expectedUserId: userId, enabled, maxCustomerCents, newCustomerCents, inventoryCapBps, autoRefreshDays, expectedRevision: saved?.revision ?? null, requestKey: crypto.randomUUID() };
    }
    const request = attempt.current;
    busy.current = true; setSaving(true); setUncertain(true); setError(null); setNotice(null);
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const response = await fetch(endpoint, { method: "POST", signal: controller.signal, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      if (!mounted.current || controller.signal.aborted) return;
      if (!response.ok) {
        const problem: unknown = await response.json().catch(() => null);
        if (!mounted.current || controller.signal.aborted) return;
        // Only a stale-settings response proves the request was never recorded.
        // Access failures or invalid receipts may follow a committed, lost response.
        if (response.status === 409 && problem && typeof problem === "object" && "code" in problem && problem.code === "STALE_SETTINGS") {
          attempt.current = null; setUncertain(false); setLoaded(false);
        }
        if (response.status === 401 || response.status === 403) setDenied(true);
        setError(failure(response.status)); return;
      }
      const parsed = z.object({ settings: settingsSchema }).safeParse(await response.json());
      if (!mounted.current || controller.signal.aborted) return;
      const result = parsed.success ? parsed.data.settings : null;
      if (!result || result.businessId !== businessId || result.revision !== (request.expectedRevision ?? 0) + 1 || result.enabled !== request.enabled || result.maxCustomerCents !== request.maxCustomerCents || result.newCustomerCents !== request.newCustomerCents || result.inventoryCapBps !== request.inventoryCapBps || result.autoRefreshDays !== request.autoRefreshDays) { setError("The save receipt could not be verified. Retry the same request to confirm its status."); return; }
      const latest = saved && saved.revision > result.revision ? saved : result;
      setSaved(latest); populate(latest); setDenied(false); attempt.current = null; setUncertain(false); setNotice("Recommendation settings save confirmed.");
    } catch { if (mounted.current && !controller.signal.aborted) setError("The save is unconfirmed. Retry the same request before changing these settings."); }
    finally { controllers.current.delete(controller); if (mounted.current && !controller.signal.aborted) { busy.current = false; setSaving(false); } }
  };
  const locked = loading || saving || uncertain || denied || !loaded;
  return <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
    <header><h1 className="text-2xl font-semibold">Credit recommendation settings</h1><p className="mt-2 text-sm text-muted-foreground">Control recommendation limits and review timing. Enabling recommendations does not automatically apply a credit policy. The review interval saves the desired cadence; scheduled refresh is not active yet.</p></header>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading saved settings…</p>}
    {loaded && !saved && <p>No recommendation configuration has been saved. Enter each setting explicitly.</p>}
    {uncertain && <section aria-label="Unconfirmed settings request" className="space-y-2 rounded-lg border p-4"><p>The last save is unconfirmed. Its original values are retained while this page remains open.</p><p className="text-sm text-muted-foreground">Refreshing saved settings does not discard this attempt. Retry it to obtain confirmation before editing.</p><Button disabled={loading || saving} onClick={() => void save()}>Retry same save</Button></section>}
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-2"><input id="recommendations-enabled" type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={locked} /><Label htmlFor="recommendations-enabled">Enable credit recommendations</Label></div>
      <div className="space-y-2"><Label htmlFor="recommendation-maximum">Maximum recommended credit per account ($)</Label><Input id="recommendation-maximum" inputMode="decimal" value={maximum} onChange={event => setMaximum(event.target.value)} disabled={locked} required /></div>
      <div className="space-y-2"><Label htmlFor="recommendation-cap">Inventory value cap (%)</Label><Input id="recommendation-cap" inputMode="decimal" value={cap} onChange={event => setCap(event.target.value)} disabled={locked} required /></div>
      <div className="space-y-2"><Label htmlFor="recommendation-new">New account recommendation ($)</Label><Input id="recommendation-new" inputMode="decimal" value={newCustomer} onChange={event => setNewCustomer(event.target.value)} disabled={locked} required /></div>
      <div className="space-y-2"><Label htmlFor="recommendation-days">Review interval (days)</Label><Input id="recommendation-days" inputMode="numeric" value={days} onChange={event => setDays(event.target.value)} disabled={locked} required /></div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={locked}>{saving ? "Saving…" : "Save settings"}</Button><Button type="button" variant="outline" disabled={loading || saving} onClick={() => void load()}>Refresh saved settings</Button></div>
    </form>
    {saved && <section aria-label="Saved recommendation settings" className="space-y-2 rounded-lg border p-4"><h2 className="font-semibold">Last confirmed configuration</h2><p>{saved.enabled ? "Recommendations enabled" : "Recommendations disabled"}</p><dl className="grid gap-3 sm:grid-cols-2"><div><dt>Maximum per account</dt><dd>${displayMoneyCents(saved.maxCustomerCents)}</dd></div><div><dt>Inventory cap</dt><dd>{formatPercentage(saved.inventoryCapBps / 100)}%</dd></div><div><dt>New account recommendation</dt><dd>${displayMoneyCents(saved.newCustomerCents)}</dd></div><div><dt>Review interval</dt><dd>{formatCount(saved.autoRefreshDays)} days</dd></div></dl></section>}
  </main>;
}
