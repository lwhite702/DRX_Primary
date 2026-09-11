import { beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), token: vi.fn(), mutation: vi.fn(), cookie: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Onboarding must not load Prisma"); });
vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} mutation = mocks.mutation; } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.cookie }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { completeOnboarding } from "@/app/onboarding/_actions";
const modules = { "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi };
const input = { businessName: "Synthetic store", ownerName: "Synthetic owner", businessType: "retail", currency: "CAD", timezone: "America/Toronto", taxEnabled: true, taxRateBps: 825, inventoryEnabled: true, locationName: "Synthetic location", city: "", region: "", country: "CA", dashboardPreset: "checkout" };
const initial = { status: "idle" as const, error: null };
function form(overrides: Record<string, string> = {}) {
  const f = new FormData();
  for (const [key, value] of Object.entries({ ...input, taxChoice: "yes", taxRate: "8.25", ...overrides })) f.set(key, String(value));
  return f;
}
async function setup() {
  const t = convexTest(schema, modules);
  const actor = t.withIdentity({ subject: "synthetic-owner", email: "synthetic@example.invalid" });
  mocks.mutation.mockImplementation((ref, args) => actor.mutation(ref, args));
  return { t, actor };
}
beforeEach(() => { vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud"; mocks.auth.mockResolvedValue({ userId: "synthetic-owner" }); mocks.token.mockResolvedValue("synthetic-token"); });
it("persists the actual currency, timezone, tax and dashboard choice before acknowledging completion", async () => {
  const { t } = await setup();
  expect(await completeOnboarding(initial, form())).toMatchObject({ status: "success", summary: { currency: "CAD", timezone: "America/Toronto", taxRateBps: 825 } });
  const rows = await t.run(async ctx => ({ businesses: await ctx.db.query("businesses").collect(), settings: await ctx.db.query("businessSettings").collect(), users: await ctx.db.query("users").collect() }));
  expect(rows.businesses).toHaveLength(1);
  expect(rows.businesses[0]).toMatchObject({ currency: "CAD", timezone: "America/Toronto", taxRateBps: 825 });
  expect(JSON.parse(rows.settings[0].settingsData!)).toMatchObject({ dashboard_preset: "checkout", location_name: input.locationName, country: "CA", onboarding_completed: true });
  expect(rows.users[0].role).toBe("OWNER");
  expect(mocks.cookie).toHaveBeenCalled();
});
it("reuses the owner business, preserves unrelated settings and performs no writes for identical retries", async () => {
  const { t, actor } = await setup();
  const args = { payload: JSON.stringify(input), expectedUserId: "synthetic-owner" };
  const first = await actor.mutation(api.onboarding.completeBusinessOnboarding, args);
  await t.run(async ctx => { const settings = await ctx.db.query("businessSettings").first(); await ctx.db.patch(settings!._id, { settingsData: JSON.stringify({ ...JSON.parse(settings!.settingsData!), default_unit: "g" }) }); });
  const before = await t.run(ctx => ctx.db.query("auditEvents").collect());
  expect(await actor.mutation(api.onboarding.completeBusinessOnboarding, args)).toEqual(first);
  expect(await t.run(ctx => ctx.db.query("auditEvents").collect())).toEqual(before);
  await actor.mutation(api.onboarding.completeBusinessOnboarding, { ...args, payload: JSON.stringify({ ...input, businessName: "Updated store" }) });
  expect((await t.run(ctx => ctx.db.query("businesses").collect()))).toHaveLength(1);
  const settings = await t.run(ctx => ctx.db.query("businessSettings").first());
  expect(JSON.parse(settings!.settingsData!).default_unit).toBe("g");
});
it("rejects another actor and never promotes a member to owner", async () => {
  const { t, actor } = await setup();
  const args = { payload: JSON.stringify(input), expectedUserId: "synthetic-owner" };
  await actor.mutation(api.onboarding.completeBusinessOnboarding, args);
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role: "CASHIER" }); });
  await expect(actor.mutation(api.onboarding.completeBusinessOnboarding, args)).rejects.toThrow(/FORBIDDEN/);
  await expect(actor.mutation(api.onboarding.completeBusinessOnboarding, { ...args, expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
  expect((await t.run(ctx => ctx.db.query("users").first()))!.role).toBe("CASHIER");
});
it("does not set completion cookies or return success after a failed mutation", async () => {
  mocks.mutation.mockRejectedValue(new Error("private provider payload"));
  expect(await completeOnboarding(initial, form())).toEqual({ status: "error", error: "Business setup could not be completed. Please retry." });
  expect(mocks.cookie).not.toHaveBeenCalled();
});
it("rejects malformed tax and invalid timezone without creating any records", async () => {
  const { t, actor } = await setup();
  for (const taxRate of ["8.25garbage", "8.255", "101", "-1"]) expect(await completeOnboarding(initial, form({ taxRate }))).toMatchObject({ status: "error" });
  await expect(actor.mutation(api.onboarding.completeBusinessOnboarding, { payload: JSON.stringify({ ...input, timezone: "Invalid/Zone" }), expectedUserId: "synthetic-owner" })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("businesses").collect())).toEqual([]);
  expect(mocks.cookie).not.toHaveBeenCalled();
});
