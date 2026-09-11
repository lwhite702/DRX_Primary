import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const create = () => convexTest(schema, { "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
it("returns only the canonical business's explicitly reconciled legacy mapping", async () => {
  const t = create(), owner = t.withIdentity({ subject: "operator" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Mapped" });
  await t.run(ctx => ctx.db.patch(businessId, { legacyPrismaBusinessId: "legacy-a" }));
  const first = await owner.query(api.onboarding.getCurrentOnboardingStatus, {});
  expect(first).toMatchObject({ status: "READY", session: { businessId, legacyBusinessId: "legacy-a" } });
  await t.run(ctx => ctx.db.patch(businessId, { legacyPrismaBusinessId: undefined }));
  const second = await owner.query(api.onboarding.getCurrentOnboardingStatus, {});
  if (second.status !== "READY") throw new Error("Expected ready session");
  expect(second.session.legacyBusinessId).toBeUndefined();
});
it("does not supply a cached-looking session when the canonical business is inactive", async () => {
  const t = create(), owner = t.withIdentity({ subject: "operator" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Inactive" });
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false }));
  expect(await owner.query(api.onboarding.getCurrentOnboardingStatus, {})).toEqual({ status: "INACTIVE" });
});
