import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import * as notificationPreferences from "../../convex/notificationPreferences";
import * as notificationPreferenceActions from "../../convex/notificationPreferenceActions";
import * as generatedApi from "../../convex/_generated/api";
import { api } from "../../convex/_generated/api";
import { clearPostHogFlagCache } from "../../lib/flags/posthog-server-provider";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), action: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { action = mocks.action; query = mocks.query; setAuth() {} } }));
import { POST } from "../../app/api/notifications/preferences/route";
import { GET } from "../../app/api/notifications/preferences/[userId]/route";
const create = () => convexTest(schema, { "notificationPreferences.ts": async () => notificationPreferences, "notificationPreferenceActions.ts": async () => notificationPreferenceActions, "_generated/api.js": async () => generatedApi });
let t: ReturnType<typeof create>;
const flags = { ops_notifications_preferences_write_enabled: true, feat_notifications_preferences_write: true };
const request = (body: unknown = { preferences: { email: false } }) => new NextRequest("https://example.invalid/api/notifications/preferences", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); clearPostHogFlagCache(); t = create();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); vi.stubEnv("POSTHOG_FLAG_OVERRIDES_JSON", JSON.stringify(flags)); vi.stubEnv("POSTHOG_PROJECT_API_KEY", ""); vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  mocks.user.mockResolvedValue({ id: "operator" }); mocks.token.mockResolvedValue("synthetic-token");
  mocks.action.mockImplementation((ref, args) => t.withIdentity({ subject: "operator" }).action(ref, args));
  mocks.query.mockImplementation((ref, args) => t.withIdentity({ subject: "operator" }).query(ref, args));
});
afterEach(() => { vi.unstubAllEnvs(); clearPostHogFlagCache(); });
it("round-trips preferences through the gated action with trusted ownership and revisions", async () => {
  const result = await POST(request({ userId: "foreign", preferences: { email: false }, expectedRevision: 0 }));
  expect(result.status).toBe(201); expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await result.json()).toEqual({ userId: "operator", preferences: { email: false }, revision: 1 });
  const read = await GET(request(), { params: Promise.resolve({ userId: "operator" }) });
  expect(await read.json()).toEqual({ userId: "operator", preferences: { email: false }, revision: 1 });
  expect((await POST(request({ preferences: { email: true }, expectedRevision: 0 }))).status).toBe(409);
});
it.each(Object.keys(flags))("enforces %s even for direct Convex action calls", async flag => {
  vi.stubEnv("POSTHOG_FLAG_OVERRIDES_JSON", JSON.stringify({ ...flags, [flag]: false }));
  expect((await POST(request())).status).toBe(503);
  await expect(t.withIdentity({ subject: "operator" }).action(api.notificationPreferenceActions.save, { expectedUserId: "operator", preferencesJson: '{}' })).rejects.toThrow(/FEATURE_DISABLED/);
  expect(await t.run(ctx => ctx.db.query("notificationPreferences").collect())).toHaveLength(0);
});
it("fails closed when flags are unresolved and denies unsigned or malformed requests", async () => {
  vi.stubEnv("POSTHOG_FLAG_OVERRIDES_JSON", "{}"); expect((await POST(request())).status).toBe(503);
  mocks.user.mockResolvedValueOnce(null); expect((await POST(request())).status).toBe(401);
  expect((await POST(request(null))).status).toBe(400);
});
it("returns absent preferences as 404 and sanitizes failures", async () => {
  expect((await GET(request(), { params: { userId: "operator" } })).status).toBe(404);
  mocks.query.mockRejectedValue(new Error("private backend content")); const result = await GET(request(), { params: { userId: "operator" } });
  expect(result.status).toBe(503); expect(JSON.stringify(await result.json())).not.toContain("private backend");
});
