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
      audits: await ctx.db.query("auditEvents").collect(),
    }));
    expect(records.businesses).toHaveLength(1);
    expect(records.users).toHaveLength(1);
    expect(records.audits).toHaveLength(1);
    expect(records.users[0]).toMatchObject({ role: "OWNER", businessId: first.businessId });
    expect(await authenticated.query(api.onboarding.getCurrentOnboardingStatus, {})).toEqual({
      status: "READY",
      session: {
        operatorId: "new_clerk_identity",
        displayName: "New Owner",
        businessId: first.businessId,
        businessName: "New Store",
        roles: ["owner"],
        permissions: ["*"],
        email: "new@example.com",
      },
    });
  });

  it("stores the complete onboarding setup in Convex without a Prisma write path", async () => {
    const t = convexTest(schema, modules);
    const authenticated = t.withIdentity({
      subject: "convex_only_owner",
      email: "owner@example.com",
    });

    const created = await authenticated.mutation(
      api.onboarding.createBusinessOnboarding,
      {
        name: "Store Owner",
        businessName: "Convex Market",
        businessType: "retail",
        currency: "USD",
        timezone: "America/New_York",
        collectTax: true,
        taxRateBps: 825,
        setup: {
          locationName: "Main Store",
          city: "Albany",
          region: "NY",
          country: "US",
          tracksInventory: true,
          dashboardPreset: "checkout",
          defaultUnit: "g",
          privacyPreset: "standard_mode",
        },
      },
    );

    const records = await t.run(async (ctx) => ({
      business: await ctx.db.get(created.businessId),
      settings: await ctx.db
        .query("businessSettings")
        .withIndex("by_businessId", (q) =>
          q.eq("businessId", created.businessId),
        )
        .unique(),
    }));

    expect(records.business).toMatchObject({
      name: "Convex Market",
      collectTax: true,
      taxRateBps: 825,
    });
    expect(JSON.parse(records.settings?.settingsData ?? "{}")).toMatchObject({
      onboarding_completed: true,
      location_name: "Main Store",
      city: "Albany",
      region: "NY",
      country: "US",
      tracks_inventory: true,
      dashboard_preset: "checkout",
      default_unit: "g",
      privacy_preset: "standard_mode",
    });
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
    expect(await authenticated.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Must Not Duplicate",
    })).toMatchObject({ status: "BUSINESS_MISSING", businessId: created.businessId });
    const businesses = await t.run(async (ctx) => ctx.db.query("businesses").collect());
    expect(businesses).toHaveLength(0);
  });
});

it("atomically provisions wizard settings and privacy without duplicating them on retry", async () => {
  const t = convexTest(schema, modules);
  const actor = t.withIdentity({ subject: "wizard-owner", email: "synthetic@example.invalid" });
  const setup = { businessName: "Wizard store", businessType: "retail", address: "Synthetic address", city: "", state: "", zipCode: "", ownerPhone: "", ownerName: "Synthetic owner", defaultUnit: "g", privacyPreset: "alias_mode", quickQuantities: [{ label: "Half", value: 0.5, unit: "g", enabled: true }], inventoryReasons: [], nicknames: [] };
  const args = { businessName: setup.businessName, businessType: setup.businessType, setupJson: JSON.stringify(setup), collectTax: false, taxRateBps: 0 };
  const first = await actor.mutation(api.onboarding.createBusinessOnboarding, args);
  expect((await actor.mutation(api.onboarding.createBusinessOnboarding, args)).businessId).toBe(first.businessId);
  const rows = await t.run(async ctx => ({ businesses: await ctx.db.query("businesses").collect(), settings: await ctx.db.query("businessSettings").collect(), policies: await ctx.db.query("businessPrivacyPolicies").collect(), users: await ctx.db.query("users").collect(), audits: await ctx.db.query("auditEvents").collect() }));
  for (const records of Object.values(rows)) expect(records).toHaveLength(1);
  expect(rows.businesses[0]).toMatchObject({ address: setup.address, taxRateBps: 0 });
  expect(JSON.parse(rows.settings[0].settingsData!)).toMatchObject({ onboarding_completed: true, quick_quantities: setup.quickQuantities });
  expect(rows.policies[0].protocol).toMatchObject({ profile: "alias_mode", alias_only_mode: true });
  expect(rows.users[0]).toMatchObject({ name: setup.ownerName, role: "OWNER" });
  expect(rows.audits[0].metadata).not.toContain("synthetic@example.invalid");
});

it("leaves no partial records when the wizard payload is malformed", async () => {
  const t = convexTest(schema, modules);
  const actor = t.withIdentity({ subject: "invalid-wizard-owner" });
  await expect(actor.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Invalid setup", setupJson: JSON.stringify({ privacyPreset: "unknown" }) })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("businesses").collect())).toEqual([]);
  expect(await t.run(ctx => ctx.db.query("users").collect())).toEqual([]);
});

it("rejects stale or missing organization claims before provisioning or resolving a business", async () => {
  const t = convexTest(schema, modules);
  const personal = t.withIdentity({ subject: "scoped-owner" });
  const organization = t.withIdentity({ subject: "scoped-owner", org_id: "org-a", org_role: "org:admin" });
  for (const [actor, expectedOrganizationId] of [[personal, "org-a"], [organization, null], [organization, "org-b"]] as const) {
    await expect(actor.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic", expectedUserId: "scoped-owner", expectedOrganizationId })).rejects.toThrow(/Organization context changed/);
    await expect(actor.query(api.onboarding.getCurrentOnboardingStatus, { expectedUserId: "scoped-owner", expectedOrganizationId })).rejects.toThrow(/Organization context changed/);
    await expect(actor.mutation(api.onboarding.completeBusinessOnboarding, { payload: "{}", expectedUserId: "scoped-owner", expectedOrganizationId })).rejects.toThrow(/Organization context changed/);
  }
  expect(await t.run(ctx => ctx.db.query("businesses").collect())).toEqual([]);
  const created = await organization.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic", expectedUserId: "scoped-owner", expectedOrganizationId: "org-a" });
  expect((await organization.query(api.onboarding.getCurrentOnboardingStatus, { expectedUserId: "scoped-owner", expectedOrganizationId: "org-a" })).status).toBe("READY");
  expect((await t.run(ctx => ctx.db.get(created.businessId)))?.clerkOrgId).toBe("org-a");
  await expect(organization.query(api.onboarding.getCurrentOnboardingStatus, { expectedUserId: "other-owner", expectedOrganizationId: "org-a" })).rejects.toThrow(/Unexpected operator/);
});

it("supports explicit personal sessions and verified v2 organization claims", async () => {
  const t = convexTest(schema, modules);
  const personal = t.withIdentity({ subject: "personal-owner" });
  await personal.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Personal", expectedOrganizationId: null });
  const organization = t.withIdentity({ subject: "organization-owner", o: { id: "org-b", rol: "admin" } });
  await organization.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Organization", expectedOrganizationId: "org-b" });
  expect((await personal.query(api.onboarding.getCurrentOnboardingStatus, { expectedOrganizationId: null })).status).toBe("READY");
  expect((await organization.query(api.onboarding.getCurrentOnboardingStatus, { expectedOrganizationId: "org-b" })).status).toBe("READY");
});
