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
    const tUser = t.withIdentity({ subject: "rep_owner_1", email: "analytics@drx.com" });

    // 1. Business Onboarding & Setup
    await tUser.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "DRX Analytics Dispensary",
      taxRateBps: 825,
    });

    const productId = await tUser.mutation(api.products.createProduct, {
      sku: "SKU-REP-1",
      productName: "Reporting Product",
      sellingPriceCents: 5000, // $50.00
      unitCostCents: 2000,
    });

    await tUser.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 100,
      totalCostCents: 200000,
    });

    // 2. Execute Checkout
    await tUser.mutation(api.checkout.processCheckout, {
      orderNumber: "ORD-REP-01",
      items: [{ productId, quantityGrams: 2 }],
      paymentMethod: "cash",
      amountPaidCents: 12000,
    });

    // 3. Query Daily Sales Aggregate (Requires OWNER/FINANCIALS permission)
    const report = await tUser.query(api.reporting.getDailySalesAggregate, {});

    expect(report.orderCount).toBe(1);
    expect(report.totalSubtotalCents).toBe(10000); // 2g * $50 = $100 (10000¢)
    expect(report.totalTaxCents).toBe(825); // 8.25% of 10000 = 825¢
    expect(report.totalRevenueCents).toBe(10825); // $108.25
    expect(report.cashSalesCents).toBe(10825); // tender after change is returned
    expect(report.paymentMethodTotalsCents).toEqual({ cash: 10825 });
    expect(report.timezone).toBe("America/New_York");
    expect(report.topProducts[0]).toMatchObject({
      id: productId,
      name: "Reporting Product",
      quantitySoldGrams: 2,
      revenueCents: 10000,
    });

    await tUser.mutation(api.checkout.processCheckout, {
      orderNumber: "ORD-REP-02",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "split",
      amountPaidCents: 5413,
      paymentTenders: [
        { method: "cash", amountCents: 2000 },
        { method: "card", amountCents: 3413 },
      ],
    });
    const splitTenderReport = await tUser.query(api.reporting.getDailySalesAggregate, {});
    expect(splitTenderReport.orderCount).toBe(2);
    expect(splitTenderReport.cashSalesCents).toBe(12825);
    expect(splitTenderReport.paymentMethodTotalsCents).toEqual({ cash: 12825, card: 3413 });
    expect(splitTenderReport.topProducts[0].quantitySoldGrams).toBe(3);

    // 4. Customer Credit Management
    const custId = await tUser.mutation(api.customers.createCustomer, {
      firstName: "Charlie",
      lastName: "Brown",
      creditLimitCents: 50000, // $500.00 limit
    });

    await tUser.mutation(api.checkout.processCheckout, {
      orderNumber: "ORD-REP-MIXED",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "mixed",
      amountPaidCents: 2500,
      customerId: custId,
    });
    const mixedReport = await tUser.query(api.reporting.getDailySalesAggregate, {});
    expect(mixedReport.cashSalesCents).toBe(15325);
    expect(mixedReport.paymentMethodTotalsCents).toEqual({ cash: 15325, card: 3413, credit: 2913 });

    await tUser.mutation(api.checkout.processCheckout, {
      orderNumber: "ORD-REP-DISCOUNT",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 4330,
      discountAmountCents: 1000,
    });
    const discountedReport = await tUser.query(api.reporting.getDailySalesAggregate, {});
    expect(discountedReport.topProducts[0].revenueCents).toBe(24000);

    const issueRes = await tUser.mutation(api.credit.issueCustomerCredit, {
      customerId: custId,
      amountCents: 15000, // Issue $150 credit
      description: "Store credit line",
    });

    expect(issueRes.newCreditUsedCents).toBe(17913);

    const payRes = await tUser.mutation(api.credit.recordCreditPayment, {
      customerId: custId,
      paymentAmountCents: 5000, // Pay $50
    });

    expect(payRes.remainingCreditUsedCents).toBe(12913);
  });
});
