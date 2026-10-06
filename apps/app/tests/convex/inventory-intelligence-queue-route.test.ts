import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as intelligence from "../../convex/inventoryIntelligence";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { POST, GET } from "../../app/api/ai/pricing-inventory/route";
const request = (suffix = "", body?: unknown) => new NextRequest(`https://example.invalid/api/ai/pricing-inventory${suffix}`, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud"; mocks.user.mockResolvedValue({ id: "owner" }); mocks.token.mockResolvedValue("synthetic-token"); });
afterEach(() => { vi.useRealTimers(); });
async function setup() {
  const t = convexTest(schema, { "inventoryIntelligence.ts": async () => intelligence, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi }), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  await t.run(ctx => ctx.db.insert("products", { businessId, sku: "fixture", productName: "Synthetic", unitCostCents: 100, sellingPriceCents: 150, quantityOnHandGrams: 20, reorderLevelGrams: 10, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  mocks.query.mockImplementation(owner.query.bind(owner)); mocks.mutation.mockImplementation(owner.mutation.bind(owner));
  return { t, owner, businessId, body: { business_id: businessId, request_id: "queued-http", analysis_type: "inventory", margin_requirement: 0.5, supplier_lead_time_days: 3 } };
}
it("enqueues with verified actor, reports actual completion and reuses the job on retry", async () => {
  const { t, businessId, body } = await setup();
  const response = await POST(request("", { ...body, requested_by: "attacker" })); expect(response.status).toBe(202);
  const queued = await response.json(); expect(queued.status).toBe("queued");
  const run = await t.run(ctx => { const id = ctx.db.normalizeId("inventoryAnalysisRuns", queued.jobId); if (!id) throw new Error("Invalid fixture ID"); return ctx.db.get(id); }); expect(run?.actorId).toBe("owner");
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const status = await GET(request(`?business_id=${businessId}&job_id=${queued.jobId}`)); expect(status.status).toBe(200);
  expect(await status.json()).toMatchObject({ status: "complete", processedCount: 1, pricingGenerated: 0, forecastsGenerated: 1 });
  expect(status.headers.get("Cache-Control")).toBe("private, no-store");
  const replay = await POST(request("", body)); expect(replay.status).toBe(200); expect(await replay.json()).toEqual({ jobId: queued.jobId, status: "complete" });
  expect((await POST(request("", { ...body, margin_requirement: 0.6 }))).status).toBe(409);
});
it("rejects missing retry IDs, unsigned users, inactive businesses and unauthorized modes before enqueue", async () => {
  const { t, businessId, body } = await setup();
  expect((await POST(request("", { ...body, request_id: undefined }))).status).toBe(400);
  mocks.user.mockResolvedValue(null); expect((await POST(request("", body))).status).toBe(401);
  mocks.user.mockResolvedValue({ id: "owner" });
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false })); expect((await POST(request("", body))).status).toBe(403);
  await t.run(ctx => ctx.db.patch(businessId, { isActive: true }));
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "staff", email: "staff@example.invalid", role: "cashier", permissions: { "pricing.manage": true }, status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const staff = t.withIdentity({ subject: "staff" }); mocks.user.mockResolvedValue({ id: "staff" }); mocks.query.mockImplementation(staff.query.bind(staff)); mocks.mutation.mockImplementation(staff.mutation.bind(staff));
  expect((await POST(request("", body))).status).toBe(403);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalysisRuns").collect())).toHaveLength(0);
});
