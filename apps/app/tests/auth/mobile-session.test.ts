import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import * as session from "../../convex/session";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
import { api } from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), token: vi.fn(), query: vi.fn(), setAuth: vi.fn() }));
vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; setAuth = mocks.setAuth; } }));
import { GET } from "@/app/api/mobile/v1/session/route";
const create = () => convexTest(schema, { "session.ts": async () => session, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
let t: ReturnType<typeof create>;
beforeEach(() => {
  vi.resetAllMocks(); t = create(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  mocks.auth.mockResolvedValue({ userId: "operator", orgId: null }); mocks.token.mockResolvedValue("synthetic-token");
  mocks.query.mockImplementation((ref, args) => t.withIdentity({ subject: args.expectedUserId }).query(ref, args));
});
afterEach(() => { vi.unstubAllEnvs(); });
it("rejects unsigned requests before accessing Convex", async () => {
  mocks.auth.mockResolvedValue({ userId: null }); expect((await GET()).status).toBe(401); expect(mocks.query).not.toHaveBeenCalled();
});
it("returns canonical owner business identity with an explicitly separate legacy mapping", async () => {
  const { businessId } = await t.withIdentity({ subject: "operator", email: "operator@example.invalid" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  await t.run(ctx => ctx.db.patch(businessId, { legacyPrismaBusinessId: "legacy-business" }));
  const response = await GET(); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({ operatorId: "operator", businessId, legacyBusinessId: "legacy-business", roles: ["owner"], permissions: ["*"], email: "operator@example.invalid" });
});
it("uses tenant-assigned grants without turning them into platform authority", async () => {
  const { businessId } = await t.withIdentity({ subject: "owner" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "operator", email: "operator@example.invalid", role: "cashier", permissions: { "inventory.manage": true, "users.manage_all": true, "*": true }, status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  expect(await (await GET()).json()).toMatchObject({ roles: ["cashier"], permissions: ["inventory.manage"] });
});
it("denies unprovisioned and inactive business sessions", async () => {
  expect((await GET()).status).toBe(403);
  const { businessId } = await t.withIdentity({ subject: "operator" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false })); expect((await GET()).status).toBe(403);
});
it("binds operator and organization context and sanitizes provider failures", async () => {
  mocks.auth.mockResolvedValue({ userId: "operator", orgId: "org-foreign" });
  expect((await GET()).status).toBe(403);
  expect(mocks.query.mock.calls[0][1]).toEqual({ expectedUserId: "operator", expectedOrganizationId: "org-foreign" });
  mocks.query.mockRejectedValue(new Error("private provider content")); const response = await GET(); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("private provider");
});
