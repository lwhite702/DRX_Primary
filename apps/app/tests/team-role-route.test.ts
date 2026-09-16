import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import * as team from "../convex/teamManagement";
import * as onboarding from "../convex/onboarding";
import * as generatedApi from "../convex/_generated/api";
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.client }));
import { PUT } from "../app/api/team/members/[id]/role/route";
const modules = { "teamManagement.ts": async () => team, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>, businessId: Id<"businesses">;
beforeEach(async () => {
  vi.resetAllMocks(); t = convexTest(schema, modules);
  ({ businessId } = await t.withIdentity({ subject: "owner" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic team" }));
  await t.run(async ctx => { for (const [clerkUserId, role] of [["manager", "manager"], ["target", "cashier"]]) await ctx.db.insert("users", { businessId, clerkUserId, email: `${clerkUserId}@example.invalid`, role, status: "ACTIVE", createdAt: 1, updatedAt: 1 }); });
  actor("owner");
});
function actor(subject: string) { mocks.client.mockResolvedValue({ client: t.withIdentity({ subject }), businessId, expectedUserId: subject }); }
const change = (role: string, id = "target") => PUT(new NextRequest("https://example.invalid/api/team/members/target/role", { method: "PUT", body: JSON.stringify({ role }) }), { params: Promise.resolve({ id }) });
it("updates only the selected membership and atomically records both roles", async () => {
  const response = await change("supervisor"); expect(response.status).toBe(200); expect(await response.json()).toEqual({ id: "target", role: "supervisor" });
  const events = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "role_update")).collect());
  expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ businessId, entityId: "target" }); expect(JSON.parse(events[0].metadata)).toEqual({ oldRole: "cashier", newRole: "supervisor" });
});
it("protects the owner membership", async () => { actor("manager"); expect((await change("cashier", "owner")).status).toBe(403); });
it("requires privileged permission to assign administrators", async () => { actor("manager"); expect((await change("admin")).status).toBe(403); });
it("allows the owner to assign administrators", async () => { expect((await change("admin")).status).toBe(200); });
