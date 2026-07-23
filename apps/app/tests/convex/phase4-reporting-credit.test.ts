import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

import * as categories from "../../convex/categories";
import * as checkout from "../../convex/checkout";
import * as credit from "../../convex/credit";
import * as customers from "../../convex/customers";
import * as intake from "../../convex/intake";
import * as members from "../../convex/members";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as reporting from "../../convex/reporting";
import * as settings from "../../convex/settings";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "categories.ts": async () => categories,
  "checkout.ts": async () => checkout,
  "credit.ts": async () => credit,
  "customers.ts": async () => customers,
  "intake.ts": async () => intake,
  "members.ts": async () => members,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "reporting.ts": async () => reporting,
  "settings.ts": async () => settings,
};

describe("Convex Phase 4 Operational Reporting & Customer Credit", () => {
  it("computes daily sales aggregates and manages customer credit accounts", async () => {
    const t = convexTest(schema, modules);

    // 1. Business Onboarding & Setup
    await t.mutation(api.onboarding.createBusinessOnboarding, {
      clerkUserId: "rep_owner_1",
      email: "analytics@drx.com",
      businessName: "DRX Analytics Dispensary",
      taxRateBps: 825,
    });

    const productId = await t.mutation(api.products.createProduct, {
      clerkUserId: "rep_owner_1",
      sku: "SKU-REP-1",
      productName: "Reporting Product",
      sellingPriceCents: 5000, // $50.00
      unitCostCents: 2000,
    });

    await t.mutation(api.intake.recordIntake, {
      clerkUserId: "rep_owner_1",
      productId,
      totalWeightGrams: 100,
      totalCostCents: 200000,
    });

    // 2. Execute Checkout
    await t.mutation(api.checkout.processCheckout, {
      clerkUserId: "rep_owner_1",
      orderNumber: "ORD-REP-01",
      items: [{ productId, quantityGrams: 2 }],
      paymentMethod: "cash",
      amountPaidCents: 12000,
    });

    // 3. Query Daily Sales Aggregate (Requires OWNER/FINANCIALS permission)
    const report = await t.query(api.reporting.getDailySalesAggregate, {
      clerkUserId: "rep_owner_1",
    });

    expect(report.orderCount).toBe(1);
    expect(report.totalSubtotalCents).toBe(10000); // 2g * $50 = $100 (10000¢)
    expect(report.totalTaxCents).toBe(825); // 8.25% of 10000 = 825¢
    expect(report.totalRevenueCents).toBe(10825); // $108.25

    // 4. Customer Credit Management
    const custId = await t.mutation(api.customers.createCustomer, {
      clerkUserId: "rep_owner_1",
      firstName: "Charlie",
      lastName: "Brown",
      creditLimitCents: 50000, // $500.00 limit
    });

    const issueRes = await t.mutation(api.credit.issueCustomerCredit, {
      clerkUserId: "rep_owner_1",
      customerId: custId,
      amountCents: 15000, // Issue $150 credit
      description: "Store credit line",
    });

    expect(issueRes.newCreditUsedCents).toBe(15000);

    const payRes = await t.mutation(api.credit.recordCreditPayment, {
      clerkUserId: "rep_owner_1",
      customerId: custId,
      paymentAmountCents: 5000, // Pay $50
    });

    expect(payRes.remainingCreditUsedCents).toBe(10000);
  });
});
