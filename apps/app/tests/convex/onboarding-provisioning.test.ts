import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "onboarding.ts": async () => onboarding,
};

describe("native provisioning contract", () => {
  it("routes a new identity to onboarding and creates exactly one OWNER tenant", async () => {
    const t = convexTest(schema, modules);
    const authenticated = t.withIdentity({ subject: "new_clerk_identity", email: "new@example.com" });

    expect(await authenticated.query(api.onboarding.getCurrentOnboardingStatus, {})).toEqual({
      status: "NEEDS_BUSINESS_ONBOARDING",
    });

    const input = { name: "New Owner", businessName: "New Store", collectTax: false };
    const first = await authenticated.mutation(api.onboarding.createBusinessOnboarding, input);
    const retry = await authenticated.mutation(api.onboarding.createBusinessOnboarding, input);
    expect(first.status).toBe("ONBOARDING_SUCCESS");
    expect(retry.status).toBe("ALREADY_ONBOARDED");

    const records = await t.run(async (ctx) => ({
      businesses: await ctx.db.query("businesses").collect(),
      users: await ctx.db.query("users").collect(),
    }));
    expect(records.businesses).toHaveLength(1);
    expect(records.users).toHaveLength(1);
    expect(records.users[0]).toMatchObject({ role: "OWNER", businessId: first.businessId });
    expect(await authenticated.query(api.onboarding.getCurrentOnboardingStatus, {})).toMatchObject({ status: "READY" });
  });

  it("returns controlled inactive and missing-business states", async () => {
    const t = convexTest(schema, modules);
    const authenticated = t.withIdentity({ subject: "recoverable_identity", email: "owner@example.com" });
    const created = await authenticated.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Recovery Store",
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(created.userId, { status: "SUSPENDED" });
    });
    expect(await authenticated.query(api.onboarding.getCurrentOnboardingStatus, {})).toEqual({ status: "INACTIVE" });

    await t.run(async (ctx) => {
      await ctx.db.patch(created.userId, { status: "ACTIVE" });
      await ctx.db.delete(created.businessId);
    });
    expect(await authenticated.query(api.onboarding.getCurrentOnboardingStatus, {})).toEqual({ status: "BUSINESS_MISSING" });
  });
});
