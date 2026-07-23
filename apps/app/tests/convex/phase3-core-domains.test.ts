import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

import * as categories from "../../convex/categories";
import * as checkout from "../../convex/checkout";
import * as customers from "../../convex/customers";
import * as intake from "../../convex/intake";
import * as members from "../../convex/members";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as settings from "../../convex/settings";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "categories.ts": async () => categories,
  "checkout.ts": async () => checkout,
  "customers.ts": async () => customers,
  "intake.ts": async () => intake,
  "members.ts": async () => members,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "settings.ts": async () => settings,
};

describe("Convex Phase 3 Core Domain Workflows", () => {
  it("executes business settings, product categories, and member invite management", async () => {
    const t = convexTest(schema, modules);

    // 1. Business Onboarding
    const onboardingRes = await t.mutation(api.onboarding.createBusinessOnboarding, {
      clerkUserId: "owner_clerk_999",
      email: "boss@drx.com",
      businessName: "DRX Greenfield Store",
      taxRateBps: 825,
    });

    expect(onboardingRes.status).toBe("ONBOARDING_SUCCESS");

    // 2. Category Creation
    const catId = await t.mutation(api.categories.createCategory, {
      clerkUserId: "owner_clerk_999",
      name: "Concentrates",
      color: "#10B981",
    });
    expect(catId).toBeDefined();

    const catList = await t.query(api.categories.listCategories, {
      clerkUserId: "owner_clerk_999",
    });
    expect(catList).toHaveLength(1);
    expect(catList[0].name).toBe("Concentrates");

    // 3. Update Business Settings
    await t.mutation(api.settings.updateBusinessSettings, {
      clerkUserId: "owner_clerk_999",
      posManagerPin: "9988",
      themePreference: "dark",
      taxRateBps: 900, // Updated to 9.00%
    });

    const settingsRes = await t.query(api.settings.getBusinessSettings, {
      clerkUserId: "owner_clerk_999",
    });
    expect(settingsRes.business.taxRateBps).toBe(900);
    expect(settingsRes.settings?.posManagerPin).toBe("9988");

    // 4. Invite Team Member
    const inviteRes = await t.mutation(api.members.inviteMember, {
      clerkUserId: "owner_clerk_999",
      email: "cashier@drx.com",
      role: "MEMBER",
    });

    expect(inviteRes.token).toBeDefined();

    const membersRes = await t.query(api.members.listMembers, {
      clerkUserId: "owner_clerk_999",
    });
    expect(membersRes.invites).toHaveLength(1);
    expect(membersRes.invites[0].email).toBe("cashier@drx.com");
  });
});
