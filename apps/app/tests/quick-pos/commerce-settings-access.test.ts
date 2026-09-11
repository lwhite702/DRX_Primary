import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as commerceSettings from "../../convex/commerceSettings";
import * as generatedApi from "../../convex/_generated/api";
import { getDefaultCommerceSettings } from "../../lib/commerce/config";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), getToken: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Commerce settings must not load Prisma"); });
vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, PATCH } from "@/app/api/pos/commerce-settings/route";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "commerceSettings.ts": async () => commerceSettings };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>;
let businessId: string;
const merchant = { ...getDefaultCommerceSettings().merchant, dispatchSlaMinutes: 8 };
const patch = (selected = businessId) => PATCH(new NextRequest("https://example.test/api/pos/commerce-settings", {
  method: "PATCH", headers: { "x-business-id": selected }, body: JSON.stringify({ merchant }),
}));
beforeEach(async () => {
  vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
  mocks.auth.mockResolvedValue({ userId: "settings-owner", getToken: mocks.getToken }); mocks.getToken.mockResolvedValue("synthetic-token");
  t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "settings-owner", email: "owner@example.invalid" });
  businessId = (await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic commerce", taxRateBps: 0 })).businessId;
  mocks.query.mockImplementation((ref, args) => owner.query(ref, args));
  mocks.mutation.mockImplementation((ref, args) => owner.mutation(ref, args));
});
it.each(["OWNER", "ADMIN", "owner", "admin", "manager"])("keeps %s authority through the real route and Convex policy", async role => {
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role }); });
  expect((await GET()).status).toBe(200);
  expect((await patch()).status).toBe(200);
  expect(await (await GET()).json()).toMatchObject({ businessId, merchant });
});
it.each(["cashier", "staff", "supervisor"])("denies %s before reading settings or writing changes", async role => {
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role }); });
  expect((await GET()).status).toBe(403);
  expect((await patch()).status).toBe(403);
});
it("respects an explicit tenant grant, rejects other tenants and inactive businesses", async () => {
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role: "staff", permissions: { "settings.configure_pos": true } }); });
  expect((await patch()).status).toBe(200);
  expect((await patch("foreign")).status).toBe(403);
  await t.run(async ctx => { const business = await ctx.db.query("businesses").first(); await ctx.db.patch(business!._id, { isActive: false }); });
  expect((await GET()).status).toBe(403);
  expect((await patch()).status).toBe(403);
});
it.each(["convex", ["convex", "another-service"]])("accepts the integrated Clerk audience %j", async aud => {
  mocks.auth.mockResolvedValue({ userId: "settings-owner", sessionClaims: { aud }, getToken: mocks.getToken });
  expect((await GET()).status).toBe(200);
  expect(mocks.getToken).toHaveBeenCalledWith();
});
it("returns safe retryable failures without provider details", async () => {
  mocks.getToken.mockRejectedValue(new Error("private token error"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private token error");
  expect(mocks.query).not.toHaveBeenCalled();
});
