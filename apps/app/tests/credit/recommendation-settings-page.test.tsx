import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const scope = vi.hoisted(() => ({ businessId: "tenant", userId: "operator" }));
vi.mock("@/lib/hooks/use-business", () => ({ useBusiness: () => ({ business: { id: scope.businessId }, loading: false }) }));
vi.mock("@/lib/adapters/auth/ui", () => ({ useAuth: () => ({ userId: scope.userId }) }));
import Page from "../../app/(app)/settings/credit/page";
const config = { businessId: "tenant", enabled: true, maxCustomerCents: 12345, inventoryCapBps: 1255, newCustomerCents: 555, autoRefreshDays: 7, revision: 1 };
const json = (settings: unknown, status = 200) => new Response(JSON.stringify({ settings }), { status });
const maxInput = () => screen.getByLabelText("Maximum recommended credit per account ($)") as HTMLInputElement;
const capInput = () => screen.getByLabelText("Inventory value cap (%)") as HTMLInputElement;
const posts = (send: ReturnType<typeof vi.fn>) => send.mock.calls.filter(([, init]) => init?.method === "POST");
async function loaded() { await waitFor(() => expect(maxInput().disabled).toBe(false)); }
function fill() {
  fireEvent.change(maxInput(), { target: { value: "123.45" } });
  fireEvent.change(capInput(), { target: { value: "12.55" } });
  fireEvent.change(screen.getByLabelText("New account recommendation ($)"), { target: { value: "5.55" } });
  fireEvent.change(screen.getByLabelText("Review interval (days)"), { target: { value: "7" } });
  fireEvent.click(screen.getByLabelText("Enable credit recommendations"));
}
beforeEach(() => { scope.businessId = "tenant"; scope.userId = "operator"; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("requires explicit fields for missing settings without guessed defaults", async () => {
  const send = vi.fn().mockResolvedValue(json(null)); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded();
  expect(maxInput().value).toBe(""); expect(capInput().value).toBe("");
  expect((screen.getByLabelText("Enable credit recommendations") as HTMLInputElement).checked).toBe(false);
  expect(screen.getByText(/No recommendation configuration has been saved/)).toBeTruthy();
  expect(send.mock.calls[0][0]).toContain("business_id=tenant&expectedUserId=operator");
  expect(send.mock.calls[0][1]).toMatchObject({ cache: "no-store", credentials: "same-origin" });
});
it("saves exact cents and basis points and confirms the expected revision", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(null)).mockResolvedValueOnce(json(config)); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText("Recommendation settings save confirmed.");
  const body = JSON.parse(posts(send)[0][1].body);
  expect(body).toMatchObject({ business_id: "tenant", expectedUserId: "operator", expectedRevision: null, maxCustomerCents: 12345, inventoryCapBps: 1255, newCustomerCents: 555, autoRefreshDays: 7, enabled: true });
  expect(body.requestKey).toMatch(/^[\da-f-]{36}$/);
  expect(screen.getByText("$123.45")).toBeTruthy(); expect(screen.getByText("12.6%")).toBeTruthy(); expect(screen.getByText("7.0 days")).toBeTruthy();
  expect(capInput().value).toBe("12.55");
});
it("retains the same failed save through refresh without allowing changed terms", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(null)).mockRejectedValueOnce(new Error("private network error")).mockResolvedValueOnce(json({ ...config, maxCustomerCents: 99999, revision: 9 })).mockResolvedValueOnce(json(config)); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText(/The save is unconfirmed/);
  expect(maxInput().disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Refresh saved settings" }));
  await waitFor(() => expect(screen.queryByText("Loading saved settings…")).toBeNull());
  expect(maxInput().value).toBe("123.45"); expect(maxInput().disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Retry same save" }));
  await screen.findByText("Recommendation settings save confirmed.");
  expect(posts(send)[0][1].body).toBe(posts(send)[1][1].body);
  expect(screen.queryByText(/private network/)).toBeNull();
  expect(maxInput().value).toBe("999.99"); expect(maxInput().disabled).toBe(false);
  expect(screen.getByText("$999.99")).toBeTruthy();
  expect(screen.queryByText("$123.45")).toBeNull();
});
it.each([{ revision: 2 }, { businessId: "other" }, { inventoryCapBps: 1256 }])("rejects a mismatched receipt and keeps its request for retry %j", async patch => {
  const send = vi.fn().mockResolvedValueOnce(json(null)).mockResolvedValueOnce(json({ ...config, ...patch })); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded(); fill(); fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText(/save receipt could not be verified/);
  expect(screen.queryByText("Recommendation settings save confirmed.")).toBeNull(); expect(maxInput().disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Retry same save" })).toBeTruthy();
});
it("handles forbidden reads explicitly without editable fallback settings", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ private: "details" }, 403)));
  render(<Page />);
  await screen.findByText("You do not have permission to manage credit recommendation settings.");
  expect(maxInput().disabled).toBe(true); expect(maxInput().value).toBe("");
  expect(screen.queryByText(/private/)).toBeNull();
});
it("recovers from definitive stale rejection with a fresh revision and request key", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(config)).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Settings changed", code: "STALE_SETTINGS" }), { status: 409 })).mockResolvedValueOnce(json({ ...config, revision: 3 })).mockResolvedValueOnce(json({ ...config, maxCustomerCents: 20000, revision: 4 })); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded(); fireEvent.change(maxInput(), { target: { value: "200.00" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText(/Settings changed or require reconciliation/);
  expect(screen.queryByRole("button", { name: "Retry same save" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh saved settings" })); await loaded();
  fireEvent.change(maxInput(), { target: { value: "200.00" } }); fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText("Recommendation settings save confirmed.");
  const first = JSON.parse(posts(send)[0][1].body), second = JSON.parse(posts(send)[1][1].body);
  expect(first.expectedRevision).toBe(1); expect(second.expectedRevision).toBe(3); expect(first.requestKey).not.toBe(second.requestKey);
});
it("suppresses late save receipts after a business or operator switch", async () => {
  let resolveSave!: (response: Response) => void;
  const send = vi.fn().mockResolvedValueOnce(json(null)).mockImplementationOnce(() => new Promise<Response>(resolve => { resolveSave = resolve; })).mockResolvedValueOnce(json(null)); vi.stubGlobal("fetch", send);
  const { rerender } = render(<Page />); await loaded(); fill(); fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await waitFor(() => expect(posts(send)).toHaveLength(1));
  scope.businessId = "other-tenant"; scope.userId = "other-operator"; rerender(<Page />); await loaded();
  expect(posts(send)[0][1].signal.aborted).toBe(true);
  await act(async () => { resolveSave(json(config)); });
  expect(screen.queryByText("Recommendation settings save confirmed.")).toBeNull(); expect(maxInput().value).toBe("");
  expect(send.mock.calls[2][0]).toContain("business_id=other-tenant&expectedUserId=other-operator");
});
it("rejects cross-business reads and aborts outstanding reads on unmount", async () => {
  const send = vi.fn().mockResolvedValueOnce(json({ ...config, businessId: "foreign" })).mockImplementationOnce(() => new Promise(() => {})); vi.stubGlobal("fetch", send);
  const { unmount } = render(<Page />);
  await screen.findByText("The saved settings response could not be verified."); expect(maxInput().disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Refresh saved settings" }));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2)); unmount();
  expect(send.mock.calls[1][1].signal.aborted).toBe(true);
});
it("preserves all editable cents at the maximum safe integer boundary", async () => {
  const send = vi.fn().mockResolvedValueOnce(json({ ...config, maxCustomerCents: Number.MAX_SAFE_INTEGER })).mockResolvedValueOnce(json({ ...config, maxCustomerCents: Number.MAX_SAFE_INTEGER, revision: 2 })); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded(); expect(maxInput().value).toBe("90071992547409.91"); expect(screen.getByText("$90071992547409.91")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save settings" })); await screen.findByText("Recommendation settings save confirmed.");
  expect(JSON.parse(posts(send)[0][1].body).maxCustomerCents).toBe(Number.MAX_SAFE_INTEGER);
});
it("rejects excessive percent precision and fractional review intervals before sending", async () => {
  const send = vi.fn().mockResolvedValue(json(null)); vi.stubGlobal("fetch", send);
  render(<Page />); await loaded(); fill(); fireEvent.change(capInput(), { target: { value: "100.001" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText(/Enter nonnegative amounts/); expect(posts(send)).toHaveLength(0);
  fireEvent.change(capInput(), { target: { value: "100" } }); fireEvent.change(screen.getByLabelText("Review interval (days)"), { target: { value: "1.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" })); expect(posts(send)).toHaveLength(0);
});

it("retains a lost save across permission revocation until its original receipt is confirmed", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(null)).mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce(new Response(JSON.stringify({ code: "FORBIDDEN", error: "Access denied" }), { status: 403 })).mockResolvedValueOnce(json(config)).mockResolvedValueOnce(json(config));
  vi.stubGlobal("fetch", send); render(<Page />); await loaded(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Save settings" })); await screen.findByText(/The save is unconfirmed/);
  fireEvent.click(screen.getByRole("button", { name: "Retry same save" })); await screen.findByText("You do not have permission to manage credit recommendation settings.");
  expect(maxInput().disabled).toBe(true); expect(screen.getByRole("button", { name: "Retry same save" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refresh saved settings" }));
  await waitFor(() => expect(screen.queryByText("Loading saved settings…")).toBeNull());
  expect(maxInput().disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Retry same save" })); await screen.findByText("Recommendation settings save confirmed.");
  expect(posts(send)).toHaveLength(3);
  expect(new Set(posts(send).map(([, init]) => init.body)).size).toBe(1);
});
it.each([[400, "INVALID_ARGUMENT"], [409, "INVALID_STATE"], [503, "UNAVAILABLE"]])("retains unconfirmed values for nondefinitive HTTP %s/%s", async (status, code) => {
  const send = vi.fn().mockResolvedValueOnce(json(null)).mockResolvedValueOnce(new Response(JSON.stringify({ code, error: "private details" }), { status: Number(status) }));
  vi.stubGlobal("fetch", send); render(<Page />); await loaded(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Retry same save" })).toBeTruthy(); expect(maxInput().disabled).toBe(true);
  expect(screen.queryByText("private details")).toBeNull();
});
