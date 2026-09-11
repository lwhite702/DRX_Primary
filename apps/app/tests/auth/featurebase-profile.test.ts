import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as featurebase from "../../convex/featurebase";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const create = () => convexTest(schema, { "featurebase.ts": async () => featurebase, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
it("projects only the signed-in operator's profile and rejects actor substitution", async () => {
  const t = create(), owner = t.withIdentity({ subject: "operator", email: "operator@example.invalid" });
  await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const profile = await owner.query(api.featurebase.currentProfile, { expectedUserId: "operator" });
  expect(Object.keys(profile!).sort()).toEqual(["email", "name"]);
  expect(profile!.email).toBe("operator@example.invalid");
  await expect(owner.query(api.featurebase.currentProfile, { expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
});
it("returns absent profile only for an authenticated operator and rejects inactive business access", async () => {
  const t = create(), owner = t.withIdentity({ subject: "operator" });
  expect(await owner.query(api.featurebase.currentProfile, { expectedUserId: "operator" })).toBeNull();
  await expect(t.query(api.featurebase.currentProfile, { expectedUserId: "operator" })).rejects.toThrow(/UNAUTHORIZED/);
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false }));
  await expect(owner.query(api.featurebase.currentProfile, { expectedUserId: "operator" })).rejects.toThrow(/FORBIDDEN/);
});
