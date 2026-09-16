import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generated from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as settings from "../../convex/creditRecommendationSettings";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Recommendation settings must not load Prisma"); });
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, POST } from "../../app/api/credit/recommendation-settings/route";
const post = (body: unknown) => POST(new NextRequest("https://example.invalid/api/credit/recommendation-settings", { method: "POST", body: JSON.stringify(body) }));
const get = (query: Record<string, string>) => GET(new NextRequest(`https://example.invalid/api/credit/recommendation-settings?${new URLSearchParams(query)}`));
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.user.mockResolvedValue({ id: "owner" }); mocks.token.mockResolvedValue("synthetic-token"); });
afterEach(() => { vi.unstubAllEnvs(); });
async function setup() {
  const t = convexTest(schema, { "creditRecommendationSettings.ts": async () => settings, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  mocks.query.mockImplementation(owner.query.bind(owner)); mocks.mutation.mockImplementation(owner.mutation.bind(owner));
  const scope = { business_id: businessId, expectedUserId: "owner" };
  const body = { ...scope, enabled: true, maxCustomerCents: 100000, inventoryCapBps: 5000, newCustomerCents: 10000, autoRefreshDays: 7, expectedRevision: null, requestKey: "settings-first" };
  return { t, owner, businessId, scope, body };
}
it("returns missing settings as null without fabricated defaults or writes", async () => {
  const { t, scope } = await setup(); const response = await get(scope);
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ settings: null });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await t.run(ctx => ctx.db.query("creditRecommendationSettings").collect())).toHaveLength(0);
});
it("saves explicit settings with immutable retries and revision conflicts", async () => {
  const { t, scope, body } = await setup();
  const first = await post(body); expect(first.status).toBe(200); const firstBody = await first.json();
  expect(firstBody.settings).toMatchObject({ enabled: true, maxCustomerCents: 100000, revision: 1 });
  const second = await post({ ...body, enabled: false, expectedRevision: 1, requestKey: "settings-second" }); expect(second.status).toBe(200);
  expect(await (await post(body)).json()).toEqual(firstBody);
  expect((await (await get(scope)).json()).settings).toMatchObject({ enabled: false, revision: 2 });
  const stale = await post({ ...body, requestKey: "settings-stale" });
  expect(stale.status).toBe(409);
  expect(await stale.json()).toMatchObject({ code: "STALE_SETTINGS" });
  expect((await post({ ...body, enabled: false })).status).toBe(409);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(2);
});
it.each([{ maxCustomerCents: -1 }, { newCustomerCents: 0.5 }, { inventoryCapBps: 10001 }, { autoRefreshDays: 0 }, { autoRefreshDays: Number.MAX_SAFE_INTEGER }, { expectedRevision: 0 }, { unwanted: true }])("rejects invalid settings %j before mutation", async patch => {
  const { body } = await setup(); expect((await post({ ...body, ...patch })).status).toBe(400); expect(mocks.mutation).not.toHaveBeenCalled();
});
it("enforces selected tenant, operator and commerce-settings authority", async () => {
  const { t, businessId, scope, body } = await setup();
  const other = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  expect((await post({ ...body, business_id: other.businessId })).status).toBe(403);
  expect((await get({ ...scope, expectedUserId: "foreign" })).status).toBe(403);
  const membership = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", "owner").eq("businessId", businessId)).unique());
  await t.run(ctx => ctx.db.patch(membership!._id, { role: "MEMBER" }));
  expect((await post(body)).status).toBe(403);
});
it("returns 401 for signed-out or expired identity and sanitizes backend errors", async () => {
  const { scope } = await setup(); mocks.user.mockResolvedValueOnce(null);
  expect((await get(scope)).status).toBe(401);
  mocks.query.mockRejectedValueOnce(new Error("UNAUTHENTICATED: private details")); expect((await get(scope)).status).toBe(401);
  mocks.query.mockRejectedValueOnce(new Error("private backend payload"));
  const failed = await get(scope); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("private");
});
it("rejects duplicate scope parameters and preserves zero values", async () => {
  const { scope, body } = await setup();
  const response = await GET(new NextRequest(`https://example.invalid/api/credit/recommendation-settings?${new URLSearchParams(scope)}&business_id=other`)); expect(response.status).toBe(400);
  const saved = await post({ ...body, maxCustomerCents: 0, inventoryCapBps: 0, newCustomerCents: 0 });
  expect(saved.status).toBe(200); expect((await saved.json()).settings).toMatchObject({ maxCustomerCents: 0, inventoryCapBps: 0, newCustomerCents: 0 });
});
