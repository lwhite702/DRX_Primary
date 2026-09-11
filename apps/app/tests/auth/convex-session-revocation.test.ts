import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as sessions from "../../convex/securitySessions";
import * as events from "../../convex/clerkIdentityEvents";
import * as generatedApi from "../../convex/_generated/api";
const modules = { "securitySessions.ts": async () => sessions, "clerkIdentityEvents.ts": async () => events, "_generated/api.js": async () => generatedApi };
const fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("CLERK_SECRET_KEY", "synthetic-secret"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const response = (status: string, user_id = "operator") => new Response(JSON.stringify({ id: "sess_synthetic", user_id, status }), { status: 200 });
it("rejects another account's session before persisting or revoking", async () => {
  const t = convexTest(schema, modules); fetchMock.mockResolvedValue(response("active", "other"));
  await expect(t.withIdentity({ subject: "operator" }).action(api.securitySessions.revoke, { sessionId: "sess_synthetic" })).rejects.toThrow(/FORBIDDEN/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(await t.run(ctx => ctx.db.query("authSessionEvents").collect())).toEqual([]);
});
it("persists intent before the provider call and confirms only verified revocation", async () => {
  const t = convexTest(schema, modules); fetchMock.mockResolvedValueOnce(response("active")).mockImplementationOnce(async () => {
    const records = await t.run(ctx => ctx.db.query("authSessionEvents").collect());
    expect(records.map(row => row.eventType)).toEqual(["session.revocation.requested"]);
    return response("revoked");
  });
  expect(await t.withIdentity({ subject: "operator" }).action(api.securitySessions.revoke, { sessionId: "sess_synthetic" })).toEqual({ success: true });
  expect(await t.run(ctx => ctx.db.query("authSessionEvents").collect())).toHaveLength(2);
  expect(fetchMock.mock.calls[1][1].method).toBe("POST");
});
it("retains uncertain attempts and reconciles an already-revoked session without a second POST", async () => {
  const t = convexTest(schema, modules), operator = t.withIdentity({ subject: "operator" });
  fetchMock.mockResolvedValueOnce(response("active")).mockRejectedValueOnce(new Error("sensitive provider failure"));
  await expect(operator.action(api.securitySessions.revoke, { sessionId: "sess_synthetic" })).rejects.toThrow("UNAVAILABLE: Session provider is unavailable");
  expect(await t.run(ctx => ctx.db.query("authSessionEvents").collect())).toHaveLength(1);
  fetchMock.mockResolvedValueOnce(response("revoked"));
  expect(await operator.action(api.securitySessions.revoke, { sessionId: "sess_synthetic" })).toEqual({ success: true });
  expect(fetchMock.mock.calls.filter(call => call[1].method === "POST")).toHaveLength(1);
  expect(await t.run(ctx => ctx.db.query("authSessionEvents").collect())).toHaveLength(2);
});
it("requires authentication before provider access", async () => {
  const t = convexTest(schema, modules);
  await expect(t.action(api.securitySessions.revoke, { sessionId: "sess_synthetic" })).rejects.toThrow(/UNAUTHORIZED/);
  expect(fetchMock).not.toHaveBeenCalled();
});
