import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import * as team from "../convex/teamManagement";
import * as onboarding from "../convex/onboarding";
import * as generatedApi from "../convex/_generated/api";
const mocks = vi.hoisted(() => ({ client: vi.fn(), send: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.client }));
vi.mock("@/lib/adapters/auth/server", () => ({ clerkClient: async () => ({ invitations: { createInvitation: mocks.send }, users: { getUser: mocks.getUser } }) }));
import { POST } from "../app/api/team/members/route";
import { GET as LIST } from "../app/api/team/route";
import { GET, DELETE } from "../app/api/team/members/[id]/route";
import { GET as AUDIT } from "../app/api/team/members/[id]/audit-logs/route";
import { PUT } from "../app/api/team/members/[id]/role/route";
const modules = { "teamManagement.ts": async () => team, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>, businessId: Id<"businesses">, foreignId: Id<"businesses">;
const params = (id = "target") => ({ params: Promise.resolve({ id }) });
const request = (body?: unknown) => new NextRequest("https://example.invalid/api/team", body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
function actor(subject: string) { mocks.client.mockResolvedValue({ client: t.withIdentity({ subject }), businessId, expectedUserId: subject }); }
beforeEach(async () => {
  vi.resetAllMocks(); t = convexTest(schema, modules);
  ({ businessId } = await t.withIdentity({ subject: "owner" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Team A" }));
  ({ businessId: foreignId } = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Team B" }));
  await t.run(async ctx => { for (const [clerkUserId, role] of [["target", "cashier"], ["manager", "manager"], ["admin", "admin"], ["restricted", "cashier"]]) await ctx.db.insert("users", { businessId, clerkUserId, email: `${clerkUserId}@example.invalid`, role, status: "ACTIVE", createdAt: 1, updatedAt: 1 }); });
  actor("owner"); mocks.send.mockResolvedValue({ id: "provider-a" });
});
const invite = (role = "cashier") => POST(request({ email: "new@example.invalid", role }));
it("requires authentication before member lookup", async () => { mocks.client.mockRejectedValue(new Error("UNAUTHORIZED:")); expect((await GET(request(), params())).status).toBe(401); });
it("blocks unauthorized business selection", async () => { mocks.client.mockResolvedValue({ client: t.withIdentity({ subject: "owner" }), businessId: foreignId, expectedUserId: "owner" }); expect((await GET(request(), params())).status).toBe(403); });
it("blocks restricted invitation senders before contacting Clerk", async () => { actor("restricted"); expect((await invite()).status).toBe(403); expect(mocks.send).not.toHaveBeenCalled(); });
it("blocks staff managers from inviting administrators", async () => { actor("manager"); expect((await invite("admin")).status).toBe(403); expect(mocks.send).not.toHaveBeenCalled(); });
it("does not resolve foreign members globally", async () => { expect((await GET(request(), params("foreign"))).status).toBe(404); });
it("lists only selected-business memberships", async () => { const response = await LIST(request()); const body = await response.json(); expect(response.status).toBe(200); expect(body.data).toHaveLength(5); expect(body.data.every((row: { business_id: string }) => row.business_id === businessId)).toBe(true); });
it("removes only the selected membership with an atomic audit", async () => { expect((await DELETE(request(), params())).status).toBe(204); const events = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "remove_member")).collect()); expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ businessId, entityId: "target" }); });
it("protects the owner from removal", async () => { actor("manager"); expect((await DELETE(request(), params("owner"))).status).toBe(409); });
it("blocks managers from removing administrators", async () => { actor("manager"); expect((await DELETE(request(), params("admin"))).status).toBe(403); });
it("scopes audit events to the selected member and tenant", async () => { await t.withIdentity({ subject: "owner" }).mutation(api.teamManagement.updateTeamRole, { businessId, expectedUserId: "owner", id: "target", role: "supervisor" }); const response = await AUDIT(request(), params()); expect(response.status).toBe(200); const logs = await response.json(); expect(logs).toHaveLength(1); expect(logs[0]).toMatchObject({ businessId, entityId: "target" }); });
it("requires separate audit permission", async () => { await t.run(async ctx => { const row = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "restricted")).unique(); await ctx.db.patch(row!._id, { permissions: { "staff.manage": true } }); }); actor("restricted"); expect((await AUDIT(request(), params())).status).toBe(403); });
it("refuses audit access for a foreign member", async () => { expect((await AUDIT(request(), params("foreign"))).status).toBe(404); });
it("creates a pending invitation without creating membership or returning its token", async () => { const response = await invite(); expect(response.status).toBe(201); expect(JSON.stringify(await response.json())).not.toContain("token"); const rows = await t.run(ctx => ctx.db.query("invites").collect()); expect(rows).toHaveLength(1); expect(rows[0].status).toBe("PENDING"); expect(await t.run(ctx => ctx.db.query("users").withIndex("by_email", q => q.eq("email", "new@example.invalid")).first())).toBeNull(); });
it("rejects a duplicate before sending a second invitation", async () => { await invite(); expect((await invite()).status).toBe(409); expect(mocks.send).toHaveBeenCalledTimes(1); });
it("retains uncertain delivery instead of losing the canonical reservation", async () => { mocks.send.mockRejectedValue(new Error("timeout")); expect((await invite()).status).toBe(503); const rows = await t.run(ctx => ctx.db.query("invites").collect()); expect(rows[0]).toMatchObject({ status: "PENDING", deliveryStatus: "UNKNOWN" }); });
it("records before-and-after roles for updates", async () => { expect((await PUT(request({ role: "supervisor" }), params())).status).toBe(200); const rows = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "role_update")).collect()); expect(JSON.parse(rows[0].metadata)).toEqual({ oldRole: "cashier", newRole: "supervisor" }); });
it("rejects owner, platform and unknown assignable roles", async () => { for (const role of ["owner", "super_admin", "unknown"]) expect((await PUT(request({ role }), params())).status).toBe(400); });
it("blocks managers from assigning administrators", async () => { actor("manager"); expect((await PUT(request({ role: "admin" }), params())).status).toBe(403); });
it("blocks managers from demoting administrators", async () => { actor("manager"); expect((await PUT(request({ role: "cashier" }), params("admin"))).status).toBe(403); });
it("enriches missing team member email and name from Clerk", async () => {
  await t.run(async (ctx) => {
    const ownerRecord = await ctx.db.query("users").withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", "owner")).unique();
    if (ownerRecord) {
      await ctx.db.patch(ownerRecord._id, { email: "" });
    }
  });
  mocks.getUser.mockImplementation(async (userId: string) => {
    if (userId === "owner") {
      return {
        id: "owner",
        firstName: "Lee",
        lastName: null,
        emailAddresses: [{ id: "email-1", emailAddress: "lee@wrelik.com" }],
        primaryEmailAddressId: "email-1",
      };
    }
    return null;
  });
  const response = await LIST(request());
  const body = await response.json();
  expect(response.status).toBe(200);
  const ownerMember = body.data.find((m: { user_id: string }) => m.user_id === "owner");
  expect(ownerMember).toBeDefined();
  expect(ownerMember.email).toBe("lee@wrelik.com");
  expect(ownerMember.name).toBe("Lee");
});
