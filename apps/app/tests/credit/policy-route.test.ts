import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generated from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as customers from "../../convex/customers";
import * as creditPolicy from "../../convex/creditPolicy";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), flag: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Policy must not load Prisma"); });
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("@/lib/posthog/server-flags", () => ({ ensureServerFlag: mocks.flag }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, POST } from "../../app/api/credit/policy/route";
const post = (body: unknown) => POST(new NextRequest("https://example.invalid/api/credit/policy", { method: "POST", body: JSON.stringify(body) }));
const get = (query: Record<string, string>) => GET(new NextRequest(`https://example.invalid/api/credit/policy?${new URLSearchParams(query)}`));
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.user.mockResolvedValue({ id: "policy-owner" }); mocks.token.mockResolvedValue("synthetic"); mocks.flag.mockResolvedValue(true); });
afterEach(() => { vi.unstubAllEnvs(); });
async function setup() {
  const t = convexTest(schema, { "creditPolicy.ts": async () => creditPolicy, "onboarding.ts": async () => onboarding, "customers.ts": async () => customers, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "policy-owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Private synthetic", creditLimitCents: 1000 });
  mocks.query.mockImplementation(owner.query.bind(owner)); mocks.mutation.mockImplementation(owner.mutation.bind(owner));
  const scope = { business_id: businessId, customer_id: customerId, expectedUserId: "policy-owner" };
  const body = { ...scope, creditEnabled: false, limitCents: 1000, expectedCreditEnabled: true, expectedLimitCents: 1000, requestKey: "policy-change-001" };
  return { t, owner, businessId, customerId, scope, body };
}
it("changes policy atomically and replays the saved result without overwriting a later change", async () => {
  const { t, customerId, scope, body } = await setup();
  const read = await get(scope); expect(read.status).toBe(200); expect(read.headers.get("cache-control")).toBe("private, no-store");
  expect(JSON.stringify(await read.json())).not.toContain("Private synthetic");
  const result = await post(body); expect(result.status).toBe(200); expect(await result.json()).toMatchObject({ creditEnabled: false, limitCents: 1000, balanceCents: 0, unlimited: false });
  expect((await post({ ...body, requestKey: "policy-change-002", expectedCreditEnabled: false, creditEnabled: true, limitCents: 0 })).status).toBe(200);
  expect(await (await post(body)).json()).toMatchObject({ creditEnabled: false, limitCents: 1000 });
  expect((await t.run(ctx => ctx.db.get(customerId)))?.creditLimitCents).toBe(0);
  expect((await post({ ...body, limitCents: 2000 })).status).toBe(409);
  expect((await post({ ...body, requestKey: "stale-policy" })).status).toBe(409);
});
it("honors availability gates, rejects malformed amounts and stale operator before writes", async () => {
  const { t, body, scope } = await setup();
  mocks.flag.mockResolvedValueOnce(false);
  expect((await post(body)).status).toBe(503); expect(mocks.mutation).not.toHaveBeenCalled();
  mocks.flag.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  expect((await post(body)).status).toBe(503); expect(mocks.mutation).not.toHaveBeenCalled();
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) expect((await post({ ...body, limitCents: value })).status).toBe(400);
  expect((await post({ ...body, expectedUserId: "other" })).status).toBe(403);
  mocks.user.mockResolvedValue(null); expect((await get(scope)).status).toBe(401);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(0);
});
it("replays an archived customer's saved policy receipt while rejecting new changes", async () => {
  const { t, customerId, body } = await setup();
  const first = await post(body);
  expect(first.status).toBe(200);
  const receipt = await first.json();
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false }));
  const replay = await post(body);
  expect(replay.status).toBe(200);
  expect(await replay.json()).toEqual(receipt);
  expect((await post({ ...body, requestKey: "after-archive" })).status).toBe(404);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(1);
});
it("rechecks authorization after feature checks and sanitizes backend failures", async () => {
  const { t, body, businessId, scope } = await setup();
  mocks.flag.mockImplementationOnce(async () => { await t.run(ctx => ctx.db.patch(businessId, { isActive: false })); return true; });
  expect((await post(body)).status).toBe(403);
  mocks.query.mockRejectedValueOnce(new Error("private backend details"));
  const failed = await get(scope); expect(failed.status).toBe(503); expect(JSON.stringify(await failed.json())).not.toContain("private backend details");
});

it("returns unauthorized when the Convex session expires", async () => {
  const { scope } = await setup();
  mocks.query.mockRejectedValueOnce(new Error("UNAUTHENTICATED: expired"));
  expect((await get(scope)).status).toBe(401);
});
it("resolves legacy identifiers before evaluating business flags and changing policy", async () => {
  const { t, businessId, customerId, body } = await setup();
  await t.run(async ctx => {
    await ctx.db.patch(businessId, { legacyPrismaBusinessId: "legacy-policy-business" });
    await ctx.db.patch(customerId, { legacyPrismaId: "legacy-policy-customer" });
  });
  expect((await post({ ...body, business_id: "legacy-policy-business", customer_id: "legacy-policy-customer" })).status).toBe(200);
  expect(mocks.flag).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ personProperties: { business_id: businessId } }));
  expect(mocks.mutation).toHaveBeenCalledWith(api.creditPolicy.change, expect.objectContaining({ businessId, customerId }));
});
