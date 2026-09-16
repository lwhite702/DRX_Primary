import React from "react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ businessId: "business", operatorId: "operator", keys: new Map<string, CryptoKey>(), rows: new Map<string, any>() }));
vi.mock("@/lib/hooks/use-business", () => ({ useBusiness: () => ({ business: { id: state.businessId }, loading: false }) }));
vi.mock("@/lib/adapters/auth/ui", () => ({ useAuth: () => ({ userId: state.operatorId }) }));
vi.mock("@/lib/credit/pending-queue", () => ({ IndexedDBCreditQueueStorage: class {
  async key(scope: string, candidate?: CryptoKey) { if (!state.keys.has(scope) && candidate) state.keys.set(scope, candidate); return state.keys.get(scope); }
  async list(scope: string, limit: number) { return [...state.rows.values()].filter(r => r.scope === scope).slice(0, limit); }
  async add(row: any) { state.rows.set(row.id, row); }
  async remove(scope: string, id: string) { if (state.rows.get(id)?.scope === scope) state.rows.delete(id); }
} }));
import { AICreditPanel } from "../../components/credit/AICreditPanel";
const today = Math.floor(Date.now() / 86400000) * 86400000;
const proposal = { recommendationId: "rec", customerId: "customer", businessId: "business", asOfDate: today, snapshotAt: today + 1, settingsRevision: 1, createdAt: today + 2, expiresAt: today + 86400000, proposedCreditEnabled: true, proposedLimitCents: 500, policyRevision: 2, recommendedLimitCents: 500, rangeMinCents: 400, rangeMaxCents: 600, riskScore: 0, justification: "Synthetic suggestion", provenance: "rules", engineVersion: "canonical_v1" };
const policy = { customerId: "customer", creditEnabled: true, limitCents: 1000, unlimited: false, balanceCents: 100 };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const view = (recommendation: unknown = proposal, currentPolicy: unknown = policy) => json({ recommendation, policy: currentPolicy });
const postCalls = (send: ReturnType<typeof vi.fn>) => send.mock.calls.filter(([, init]) => init?.method === "POST");
async function loaded() { await waitFor(() => expect((screen.getByRole("button", { name: "Generate recommendation" }) as HTMLButtonElement).disabled).toBe(false)); }
beforeEach(() => { state.businessId = "business"; state.operatorId = "operator"; state.keys.clear(); state.rows.clear(); vi.stubGlobal("crypto", webcrypto); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("renders actual saved range, zero score and distinct current policy without invented punctuality", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(view())); render(<AICreditPanel customer_id="legacy" can_apply />); await loaded();
  expect(screen.getByText("Credit enabled · Limit $10.00")).toBeTruthy(); expect(screen.getByText("Suggested range $4.00 – $6.00")).toBeTruthy(); expect(screen.getByText(/Recorded risk score 0.0/)).toBeTruthy(); expect(screen.getByText(/Repayment timing was not evaluated/)).toBeTruthy(); expect(screen.getByText(/Rule-based suggestion/)).toBeTruthy(); expect(screen.queryByText(/Low Risk/)).toBeNull();
});
it("shows missing recommendation and read errors without a fabricated policy", async () => {
  const send = vi.fn().mockResolvedValueOnce(view(null)).mockResolvedValueOnce(json({ code: "FORBIDDEN", error: "private" }, 403)); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); expect(screen.getByText("No saved recommendation is available.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reload current policy" })); await screen.findByText("You do not have permission to manage credit recommendations."); expect((screen.getByRole("button", { name: "Generate recommendation" }) as HTMLButtonElement).disabled).toBe(true); expect(screen.queryByText("private")).toBeNull();
});
it("restores a lost generation after remount and retries its identical encrypted request", async () => {
  const send = vi.fn().mockResolvedValueOnce(view(null)).mockRejectedValueOnce(new Error("lost")); vi.stubGlobal("fetch", send);
  const first = render(<AICreditPanel customer_id="legacy" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Generate recommendation" })); await screen.findByRole("alert");
  expect(state.rows.size).toBe(1); const body = postCalls(send)[0][1].body; expect(JSON.parse(body).customer_id).toBe("customer"); first.unmount();
  send.mockResolvedValueOnce(view(null)).mockImplementationOnce(async (_url, init) => json({ recommendation: proposal, requestKey: JSON.parse(init.body).requestKey })).mockResolvedValueOnce(view());
  render(<AICreditPanel customer_id="legacy" can_apply />); await screen.findByRole("button", { name: "Retry generation" }); expect(postCalls(send)).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry generation" })); await screen.findByText("Request confirmed. Current policy reloaded.");
  expect(postCalls(send)[1][1].body).toBe(body); expect(state.rows.size).toBe(0);
});
it("confirms historical apply receipt then reloads newer current policy", async () => {
  const send = vi.fn().mockResolvedValueOnce(view()).mockImplementationOnce(async (_url, init) => json({ requestKey: JSON.parse(init.body).requestKey, result: { ...policy, limitCents: 500, recommendationId: "rec", policyRevision: 3 } })).mockResolvedValueOnce(view(proposal, { ...policy, limitCents: 900 })); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Apply saved recommendation" })); await screen.findByText("Request confirmed. Current policy reloaded.");
  expect(screen.getByText("Credit enabled · Limit $9.00")).toBeTruthy(); expect(screen.queryByText("Credit enabled · Limit $5.00")).toBeNull();
});
it("retains an unverifiable apply receipt and locks new edits", async () => {
  const send = vi.fn().mockResolvedValueOnce(view()).mockResolvedValueOnce(json({ requestKey: "wrong", result: policy })); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Apply saved recommendation" })); await screen.findByText(/response could not be verified/);
  expect(screen.getByRole("button", { name: "Retry application" })).toBeTruthy(); expect((screen.getByRole("button", { name: "Edit credit policy" }) as HTMLButtonElement).disabled).toBe(true); expect(state.rows.size).toBe(1);
});
it("aborts a switched operator's save and hides the original encrypted attempt", async () => {
  let resolve!: (value: Response) => void;
  const send = vi.fn().mockResolvedValueOnce(view(null)).mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; })).mockResolvedValueOnce(view(null)); vi.stubGlobal("fetch", send);
  const { rerender } = render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Generate recommendation" })); await waitFor(() => expect(postCalls(send)).toHaveLength(1));
  state.operatorId = "other"; rerender(<AICreditPanel customer_id="customer" can_apply />); await loaded(); expect(postCalls(send)[0][1].signal.aborted).toBe(true); expect(screen.queryByRole("button", { name: "Retry generation" })).toBeNull();
  await act(async () => resolve(json({ requestKey: JSON.parse(postCalls(send)[0][1].body).requestKey, recommendation: proposal })));
  expect(state.rows.size).toBe(1); expect(screen.queryByText(/Request confirmed/)).toBeNull();
});
it("saves manual policy in exact cents and makes enabled zero unlimited explicit", async () => {
  const send = vi.fn().mockResolvedValueOnce(view()).mockImplementationOnce(async (_url, init) => json({ ...policy, limitCents: 0, unlimited: true, requestKey: JSON.parse(init.body).requestKey })).mockResolvedValueOnce(view(proposal, { ...policy, limitCents: 0, unlimited: true })); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Edit credit policy" })); fireEvent.change(screen.getByLabelText("Credit limit ($)"), { target: { value: "0" } }); expect(screen.getByText("Enabled credit with a zero limit is unlimited.")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Save credit policy" })); await screen.findByText("Request confirmed. Current policy reloaded.");
  expect(postCalls(send)[0][0]).toBe("/api/credit/policy"); expect(JSON.parse(postCalls(send)[0][1].body)).toMatchObject({ creditEnabled: true, limitCents: 0, expectedCreditEnabled: true, expectedLimitCents: 1000 }); expect(JSON.parse(postCalls(send)[0][1].body)).not.toHaveProperty("reason");
});

it("explicitly cancels an unrecorded application and unlocks new attempts only after policy reload", async () => {
  const send = vi.fn().mockResolvedValueOnce(view()).mockRejectedValueOnce(new Error("lost")); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Apply saved recommendation" })); await screen.findByRole("alert");
  send.mockImplementationOnce(async (_url, init) => json({ status: "cancelled", recommendationId: "rec", requestKey: JSON.parse(init.body).requestKey })).mockResolvedValueOnce(view());
  fireEvent.click(screen.getByRole("button", { name: "Check status and cancel unrecorded request" })); await screen.findByText("Unrecorded request cancelled. Current policy reloaded.");
  expect(send.mock.calls[2][1].method).toBe("DELETE"); expect(state.rows.size).toBe(0); await loaded();
});
it("keeps a lost generation across permission revocation and only retries after scope access returns", async () => {
  const send = vi.fn().mockResolvedValueOnce(view(null)).mockRejectedValueOnce(new Error("lost")).mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403)); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Generate recommendation" })); await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry generation" })); await screen.findByText("You do not have permission to manage credit recommendations."); expect(state.rows.size).toBe(1);
  expect(screen.queryByRole("button", { name: "Check status and cancel unrecorded request" })).toBeNull();
});
it("shows zero recommendations as disabled credit while retaining the saved numeric limit", async () => {
  const zero = { ...proposal, recommendedLimitCents: 0, rangeMinCents: 0, rangeMaxCents: 0, proposedCreditEnabled: false, proposedLimitCents: 1000 };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(view(zero))); render(<AICreditPanel customer_id="customer" can_apply />); await loaded();
  expect(screen.getByText("Recommended amount $0.00")).toBeTruthy(); expect(screen.getByText("Proposed credit disabled; stored limit $10.00")).toBeTruthy(); expect(screen.queryByText("Credit enabled · Unlimited")).toBeNull();
});
it("keeps current-policy actions locked if post-confirmation reload fails", async () => {
  const send = vi.fn().mockResolvedValueOnce(view()).mockImplementationOnce(async (_url, init) => json({ requestKey: JSON.parse(init.body).requestKey, result: { ...policy, limitCents: 500, recommendationId: "rec", policyRevision: 3 } })).mockRejectedValueOnce(new Error("read unavailable")); vi.stubGlobal("fetch", send);
  render(<AICreditPanel customer_id="customer" can_apply />); await loaded(); fireEvent.click(screen.getByRole("button", { name: "Apply saved recommendation" })); await screen.findByRole("alert");
  expect(state.rows.size).toBe(0); expect(screen.queryByText("Request confirmed. Current policy reloaded.")).toBeNull(); expect((screen.getByRole("button", { name: "Generate recommendation" }) as HTMLButtonElement).disabled).toBe(true); expect(screen.getByText("Credit enabled · Limit $10.00")).toBeTruthy();
});
