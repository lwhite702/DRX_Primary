"use client";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/adapters/auth/ui";
import { useBusiness } from "@/lib/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount, formatCount } from "@/lib/number-format";
import { loadRecommendation, RecommendationAttempts, RecommendationClientError, sendRecommendationAttempt, resolveRecommendationAttempt, type RecommendationAttempt, type RecommendationScope, type CreditRecommendation, type RecommendationPolicy } from "@/lib/credit/recommendation-client";
const centsInput = (cents: number) => { const digits = String(cents).padStart(3, "0"); return `${digits.slice(0, -2)}.${digits.slice(-2)}`; };
const money = (cents: number) => { const value = formatAmount(cents / 100); return `$${value === centsInput(cents) ? value : centsInput(cents)}`; };
function parseCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}
function message(error: unknown) { return error instanceof RecommendationClientError ? error.message : "Credit recommendations are temporarily unavailable. Pending requests are retained."; }
export function AICreditPanel({ customer_id, can_apply }: { customer_id: string; can_apply: boolean }) {
  const { business, loading } = useBusiness(); const { userId } = useAuth();
  const deployment = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (loading) return <p role="status">Loading credit account…</p>;
  if (!business || !userId || !deployment) return <p role="status">Select a business and sign in to manage credit recommendations.</p>;
  const scope = { deployment, businessId: business.id, operatorId: userId, customerId: customer_id, sourceCustomerId: customer_id };
  return <CreditEditor key={JSON.stringify(scope)} initialScope={scope} canApply={can_apply} />;
}
function CreditEditor({ initialScope, canApply }: { initialScope: RecommendationScope; canApply: boolean }) {
  const attempts = useRef(new RecommendationAttempts()).current;
  const [policy, setPolicy] = useState<RecommendationPolicy | null>(null);
  const [recommendation, setRecommendation] = useState<CreditRecommendation | null>(null);
  const [pending, setPending] = useState<RecommendationAttempt[]>([]);
  const [loading, setLoading] = useState(true), [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [ready, setReady] = useState(false), [editing, setEditing] = useState(false);
  const [limit, setLimit] = useState(""), [enabled, setEnabled] = useState(false);
  const scope = useRef(initialScope), alive = useRef(false), busy = useRef(false), controllers = useRef(new Set<AbortController>());
  async function reload() {
    if (!alive.current) return;
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const restored = await attempts.restore(scope.current);
      if (!alive.current || controller.signal.aborted) return;
      setPending(restored); setStorageReady(true);
      const data = await loadRecommendation(scope.current, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      if (restored.length && restored[0].customerId !== data.policy.customerId) throw new RecommendationClientError("INVALID_RESPONSE");
      // A fresh request uses the live mapping; recovery uses its encrypted original identity.
      scope.current = { ...scope.current, customerId: data.policy.customerId };
      setPolicy(data.policy); setRecommendation(data.recommendation); setPending(restored); setReady(true);
      if (!restored.length) { setLimit(centsInput(data.policy.limitCents)); setEnabled(data.policy.creditEnabled); }
    } finally { controllers.current.delete(controller); }
  }
  async function refresh() {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(null); setReady(false);
    try { await reload(); } catch (cause) { if (alive.current) setError(message(cause)); }
    finally { if (alive.current) { busy.current = false; setLoading(false); } }
  }
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; for (const controller of controllers.current) controller.abort(); }; }, []); // Scope changes remount and abort.
  async function perform(kind: "generate" | "apply" | "policy", retry?: RecommendationAttempt) {
    if (busy.current || (retry ? !storageReady : !ready || pending.length > 0)) return;
    if (!retry && kind !== "generate" && !canApply) return;
    const amount = kind === "policy" && !retry ? parseCents(limit) : 0;
    if (amount === null) { setError("Enter a nonnegative credit limit with at most two decimals."); return; }
    if (!retry && (!policy || (kind === "apply" && !recommendation))) return;
    busy.current = true; setWorking(true); setError(null); setNotice(null);
    const controller = new AbortController(); controllers.current.add(controller);
    const requestScope = { ...scope.current, customerId: retry?.customerId ?? scope.current.customerId };
    try {
      const entry = retry ?? await attempts.create(scope.current, kind === "generate" ? { kind } : kind === "apply" ? { kind, proposal: recommendation!, balanceCents: policy!.balanceCents } : { kind, creditEnabled: enabled, limitCents: amount!, expectedCreditEnabled: policy!.creditEnabled, expectedLimitCents: policy!.limitCents });
      if (!alive.current || controller.signal.aborted) return;
      const waiting = await attempts.restore(scope.current);
      if (!alive.current || controller.signal.aborted) return;
      setPending(waiting);
      await sendRecommendationAttempt(requestScope, entry, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      await attempts.confirm(scope.current, entry.requestKey);
      if (!alive.current || controller.signal.aborted) return;
      const remaining = await attempts.restore(scope.current);
      if (!alive.current || controller.signal.aborted) return;
      setPending(remaining); setNotice("Request confirmed. Current policy has not been reloaded."); setEditing(false); setReady(false);
      await reload();
      if (alive.current) setNotice("Request confirmed. Current policy reloaded.");
    } catch (cause) { if (alive.current && !controller.signal.aborted) setError(message(cause)); }
    finally { controllers.current.delete(controller); if (alive.current) { busy.current = false; setWorking(false); } }
  }
  async function resolve(entry: RecommendationAttempt) {
    if (busy.current || !storageReady) return;
    busy.current = true; setWorking(true); setError(null); setNotice(null);
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const status = await resolveRecommendationAttempt({ ...scope.current, customerId: entry.customerId }, entry, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      await attempts.confirm(scope.current, entry.requestKey);
      if (!alive.current || controller.signal.aborted) return;
      const remaining = await attempts.restore(scope.current);
      if (!alive.current || controller.signal.aborted) return;
      setPending(remaining); setReady(false);
      setNotice(status === "recorded" ? "Recorded policy change confirmed. Current policy has not been reloaded." : "Unrecorded request cancelled. Current policy has not been reloaded.");
      await reload();
      if (alive.current) setNotice(status === "recorded" ? "Recorded policy change confirmed. Current policy reloaded." : "Unrecorded request cancelled. Current policy reloaded.");
    } catch (cause) { if (alive.current && !controller.signal.aborted) setError(message(cause)); }
    finally { controllers.current.delete(controller); if (alive.current) { busy.current = false; setWorking(false); } }
  }
  const locked = loading || working || !ready || pending.length > 0;
  const expired = recommendation ? Date.now() >= recommendation.expiresAt : false;
  return <section aria-label="Credit recommendations" className="space-y-4">
    <h2 className="text-lg font-semibold">Credit recommendations</h2>
    {loading && <p role="status">Loading saved credit settings…</p>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <Button variant="outline" disabled={loading || working} onClick={() => void refresh()}>Reload current policy</Button>
    {policy && <section aria-label="Current credit policy" className="rounded-lg border p-4"><h3 className="font-semibold">Last loaded credit policy</h3><p>{policy.creditEnabled ? policy.unlimited ? "Credit enabled · Unlimited" : `Credit enabled · Limit ${money(policy.limitCents)}` : `Credit disabled · Stored limit ${money(policy.limitCents)}`}</p><p>Balance {money(policy.balanceCents)}</p>{!ready && <p>Current policy needs a successful reload before a new request.</p>}</section>}
    {pending.length > 0 && <section aria-label="Pending credit requests" className="rounded-lg border p-4 space-y-2"><p>{formatCount(pending.length)} unconfirmed request(s). Original requests are saved encrypted on this browser, including across reloads. Reloading current policy does not discard them.</p>{pending.map(entry => <div key={entry.requestKey} className="space-y-2"><Button disabled={loading || working || !storageReady} onClick={() => void perform(entry.request.kind, entry)}>Retry {entry.request.kind === "generate" ? "generation" : entry.request.kind === "apply" ? "application" : "policy change"}</Button>{entry.request.kind !== "generate" && <><p>Recorded changes are kept. Unrecorded attempts can be stopped.</p><Button variant="outline" disabled={loading || working || !storageReady} onClick={() => void resolve(entry)}>Check status and cancel unrecorded request</Button></>}</div>)}</section>}
    {recommendation ? <section aria-label="Saved recommendation" className="rounded-lg border p-4 space-y-2"><h3 className="font-semibold">Saved recommendation</h3><p>{recommendation.provenance === "provider" ? "AI-generated suggestion" : "Rule-based suggestion"} · {new Date(recommendation.createdAt).toLocaleString()}</p><p>Recommended amount {money(recommendation.recommendedLimitCents)}</p><p>Suggested range {money(recommendation.rangeMinCents)} – {money(recommendation.rangeMaxCents)}</p><p>Recorded risk score {formatCount(recommendation.riskScore)}/100. Repayment timing was not evaluated.</p><p>{recommendation.justification}</p><p>{recommendation.proposedCreditEnabled ? `Proposed enabled limit ${money(recommendation.proposedLimitCents)}` : `Proposed credit disabled; stored limit ${money(recommendation.proposedLimitCents)}`}</p><p>{expired ? "Expired. Generate a new recommendation." : `Expires ${new Date(recommendation.expiresAt).toLocaleString()}. Applying checks current facts again.`}</p>{canApply && <Button disabled={locked || expired} onClick={() => void perform("apply")}>Apply saved recommendation</Button>}</section> : ready && <p>No saved recommendation is available.</p>}
    <Button disabled={locked} onClick={() => void perform("generate")}>Generate recommendation</Button>
    {canApply && <Button variant="outline" disabled={locked} onClick={() => setEditing(!editing)}>Edit credit policy</Button>}
    {editing && <form aria-label="Manual credit policy" className="space-y-3 rounded-lg border p-4" onSubmit={event => { event.preventDefault(); void perform("policy"); }}><div className="flex gap-2"><input id="credit-policy-enabled" type="checkbox" checked={enabled} disabled={locked} onChange={event => setEnabled(event.target.checked)} /><Label htmlFor="credit-policy-enabled">Enable credit</Label></div><Label htmlFor="credit-policy-limit">Credit limit ($)</Label><Input id="credit-policy-limit" inputMode="decimal" value={limit} disabled={locked} onChange={event => setLimit(event.target.value)} /><p>{enabled && parseCents(limit) === 0 ? "Enabled credit with a zero limit is unlimited." : "Disabling credit stops new charges and preserves the balance."}</p><Button type="submit" disabled={locked}>Save credit policy</Button></form>}
  </section>;
}
