import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as session from "../../convex/session";
import * as onboarding from "../../convex/onboarding";
import * as businessProfiles from "../../convex/businessProfiles";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ token: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Profile API must not load Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, PATCH } from "../../app/api/business/profile/route";
const modules = { "_generated/api.js": async () => generatedApi, "session.ts": async () => session, "onboarding.ts": async () => onboarding, "businessProfiles.ts": async () => businessProfiles };
beforeEach(() => {
  vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
  mocks.token.mockResolvedValue("synthetic-token");
});
async function setup() {
  const t = convexTest(schema, modules);
  const actor = t.withIdentity({ subject: "profile-owner", email: "synthetic@example.invalid" });
  const created = await actor.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic original" });
  await t.run(ctx => ctx.db.patch(created.businessId, { legacyPrismaBusinessId: "legacy-synthetic", address: "Synthetic address" }));
  mocks.query.mockImplementation((ref, args) => actor.query(ref, args));
  mocks.mutation.mockImplementation((ref, args) => actor.mutation(ref, args));
  return { t, actor, ...created };
}
function patch(body: unknown, businessId?: string) {
  return new NextRequest("https://example.invalid/api/business/profile", { method: "PATCH", headers: { "Content-Type": "application/json", ...(businessId ? { "X-Business-Id": businessId } : {}) }, body: JSON.stringify(body) });
}
it("persists aliased fields in Convex, preserves omitted fields, and audits no private values", async () => {
  const { t, actor, businessId } = await setup();
  const update = { business_name: "Synthetic renamed", phone_number: "0000000000", email: "contact@example.invalid" };
  expect((await PATCH(patch(update, "legacy-synthetic"))).status).toBe(200);
  const result = await GET(new NextRequest("https://example.invalid/api/business/profile", { headers: { "X-Business-Id": businessId } }));
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect((await result.json()).data).toMatchObject({ id: businessId, businessName: "Synthetic renamed", phoneNumber: "0000000000", email: "contact@example.invalid", address: "Synthetic address", createdAt: expect.stringMatching(/Z$/) });
  expect(await actor.query(api.session.currentBusinessProfile, {})).toMatchObject({ businessName: "Synthetic renamed" });
  await PATCH(patch(update));
  const audits = await t.run(ctx => ctx.db.query("auditEvents").collect());
  const updates = audits.filter(row => row.action === "BUSINESS_PROFILE_UPDATED");
  expect(updates).toHaveLength(1);
  expect(JSON.parse(updates[0].metadata!)).toEqual({ changedFields: expect.arrayContaining(["name", "phoneNumber", "email"]) });
  expect(updates[0].metadata).not.toContain("contact@example.invalid");
  expect((await PATCH(patch({ phone_number: "", email: "" }))).status).toBe(200);
  expect(await actor.query(api.session.currentBusinessProfile, {})).toMatchObject({ phoneNumber: "", email: "", address: "Synthetic address" });
});
it("enforces the selected membership's settings permission and explicit grants", async () => {
  const { t, userId, businessId } = await setup();
  await t.run(ctx => ctx.db.patch(userId, { role: "MEMBER" }));
  expect((await PATCH(patch({ businessName: "Denied" }))).status).toBe(403);
  expect(await t.run(ctx => ctx.db.get(businessId))).toMatchObject({ name: "Synthetic original" });
  await t.run(ctx => ctx.db.patch(userId, { permissions: { "settings.configure_pos": true } }));
  expect((await PATCH(patch({ businessName: "Allowed" }))).status).toBe(200);
  expect((await PATCH(patch({ businessName: "Foreign" }, "foreign"))).status).toBe(401);
});
it("rejects contradictory aliases, invalid data, ownership fields and anonymous/provider failures", async () => {
  const { t, businessId, actor } = await setup();
  for (const body of [{ businessName: "A", business_name: "B" }, { businessName: " " }, { email: "invalid" }, { state: "x".repeat(51) }, { ownerId: "outsider" }]) {
    expect((await PATCH(patch(body))).status).toBe(400);
  }
  await expect(actor.mutation(api.businessProfiles.updateProfile, { businessId, expectedUserId: "outsider", patch: { businessName: "No" } })).rejects.toThrow(/FORBIDDEN/);
  expect(await t.run(ctx => ctx.db.get(businessId))).toMatchObject({ name: "Synthetic original" });
  mocks.token.mockResolvedValue(null);
  expect((await PATCH(patch({ businessName: "No" }))).status).toBe(401);
  mocks.token.mockResolvedValue("synthetic-token");
  mocks.query.mockRejectedValue(new Error("private-provider-payload"));
  const unavailable = await PATCH(patch({ businessName: "No" }));
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).not.toContain("private-provider-payload");
});
