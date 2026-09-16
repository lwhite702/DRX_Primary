import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as drawer from "../../convex/drawer";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const modules = { "drawer.ts": async () => drawer, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi };
it("records one drawer event and one audit for identical retries, rejecting changed requests", async () => {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Drawer tenant" });
  const args = { businessId, expectedUserId: "owner", requestId: "00000000-0000-4000-8000-000000000001", eventType: "no_sale" as const, note: "Synthetic note" };
  const result = await owner.mutation(api.drawer.record, args);
  expect(await owner.mutation(api.drawer.record, args)).toEqual(result);
  await expect(owner.mutation(api.drawer.record, { ...args, note: "Changed" })).rejects.toThrow(/CONFLICT/);
  expect(await t.run(ctx => ctx.db.query("drawerEvents").collect())).toHaveLength(1);
  const audit = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "drawer_event")).collect());
  expect(audit).toHaveLength(1); expect(audit[0].metadata).not.toContain("Synthetic note");
});
it("denies inactive/foreign business selection and users without checkout permission", async () => {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Drawer tenant" });
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "restricted", email: "restricted@example.invalid", role: "unassigned", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const args = { businessId, expectedUserId: "restricted", requestId: "00000000-0000-4000-8000-000000000001", eventType: "no_sale" as const, note: "" };
  await expect(t.withIdentity({ subject: "restricted" }).mutation(api.drawer.record, args)).rejects.toThrow(/FORBIDDEN/);
  await expect(t.withIdentity({ subject: "outsider" }).mutation(api.drawer.record, { ...args, expectedUserId: "outsider" })).rejects.toThrow();
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false }));
  await expect(owner.mutation(api.drawer.record, { ...args, expectedUserId: "owner" })).rejects.toThrow(/FORBIDDEN/);
});
