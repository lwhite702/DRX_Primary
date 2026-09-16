import { describe, expect, it } from "vitest";
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

describe("Authenticated Beta End-to-End Workflow (WRE-5)", () => {
  it("proves the complete lifecycle: onboarding -> inventory intake -> customer creation -> checkout -> FIFO decrement -> reporting -> multi-session visibility", async () => {
    const t = convexTest(schema, modules);

    // -------------------------------------------------------------------------
    // 1. Initial Identity & Clean Onboarding
    // -------------------------------------------------------------------------
    const operatorA = t.withIdentity({
      subject: "clerk_beta_operator_001",
      email: "operator1@beta.deelrx.com",
    });

    const initialStatus = await operatorA.query(
      api.onboarding.getCurrentOnboardingStatus,
      {},
    );
    expect(initialStatus.status).toBe("NEEDS_BUSINESS_ONBOARDING");

    const onboardingResult = await operatorA.mutation(
      api.onboarding.createBusinessOnboarding,
      {
        businessName: "Beta Dispensary Operations",
        businessType: "retail",
        taxRateBps: 800, // 8.00% tax
        collectTax: true,
      },
    );

    expect(onboardingResult.status).toBe("ONBOARDING_SUCCESS");
    const businessId = onboardingResult.businessId;
    expect(businessId).toBeDefined();

    // Verify session state is READY
    const postOnboardingStatus = await operatorA.query(
      api.onboarding.getCurrentOnboardingStatus,
      {},
    );
    expect(postOnboardingStatus).toMatchObject({
      status: "READY",
      session: {
        businessId,
        businessName: "Beta Dispensary Operations",
        roles: ["owner"],
      },
    });

    // -------------------------------------------------------------------------
    // 2. Catalog Setup & Multi-batch Inventory Intake (FIFO)
    // -------------------------------------------------------------------------
    const productId = await operatorA.mutation(api.products.createProduct, {
      sku: "BETA-E2E-FLOWER",
      productName: "Premium Beta Flower",
      category: "Flower",
      sellingPriceCents: 2000, // $20.00 / unit
      unitCostCents: 800, // $8.00 cost
      isTaxable: true,
      location: "Vault A-1",
    });

    // Batch 1: 10 units at $8.00
    const intakeBatch1 = await operatorA.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 10,
      totalCostCents: 8000,
      lotNumber: "LOT-2026-001",
      location: "Vault A-1",
      supplier: "Alpha Farms",
    });
    expect(intakeBatch1.batchId).toBeDefined();

    // Batch 2: 10 units at $10.00
    const intakeBatch2 = await operatorA.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 10,
      totalCostCents: 10000,
      lotNumber: "LOT-2026-002",
      location: "Vault A-2",
      supplier: "Beta Cultivators",
    });
    expect(intakeBatch2.batchId).toBeDefined();

    // Check inventory on hand = 20
    const productList = await operatorA.query(api.products.listProducts, {});
    const catalogProduct = productList.find((p) => p._id === productId);
    expect(catalogProduct?.quantityOnHandGrams).toBe(20);

    // -------------------------------------------------------------------------
    // 3. Customer Lifecycle & Store Credit Setup
    // -------------------------------------------------------------------------
    const customerId = await operatorA.mutation(api.customers.createCustomer, {
      firstName: "Jane",
      lastName: "Operator",
      phoneNumber: "555-019-9001",
      email: "jane.operator@example.test",
      creditLimitCents: 50000, // $500.00 store credit limit
      creditEnabled: true,
    });
    expect(customerId).toBeDefined();

    // -------------------------------------------------------------------------
    // 4. Completed POS Checkout (Sale 1: 5 units consuming from Batch 1)
    // -------------------------------------------------------------------------
    const order1 = await operatorA.mutation(api.checkout.processCheckout, {
      orderNumber: "BETA-ORDER-0001",
      customerId,
      items: [{ productId, quantityGrams: 5 }],
      paymentMethod: "cash",
      amountPaidCents: 11000, // Total: 5 * $20 = $100 + 8% tax ($8.00) = $108.00 (10800c) -> Paid 11000c
    });

    expect(order1).toMatchObject({
      status: "COMPLETED",
      subtotalCents: 10000,
      taxAmountCents: 800,
      totalAmountCents: 10800,
      changeAmountCents: 200, // $2.00 change
    });

    // Verify stock decrement: 20 - 5 = 15 units remaining
    const productsAfterSale1 = await operatorA.query(api.products.listProducts, {});
    const productAfterSale1 = productsAfterSale1.find((p) => p._id === productId);
    expect(productAfterSale1?.quantityOnHandGrams).toBe(15);

    // -------------------------------------------------------------------------
    // 5. Completed POS Checkout (Sale 2: 8 units spanning Batch 1 & Batch 2)
    // -------------------------------------------------------------------------
    // Remaining in Batch 1: 5 units. Sale needs 8 units -> 5 from Batch 1, 3 from Batch 2.
    const order2 = await operatorA.mutation(api.checkout.processCheckout, {
      orderNumber: "BETA-ORDER-0002",
      customerId,
      items: [{ productId, quantityGrams: 8 }],
      paymentMethod: "credit", // Customer store credit tender
      amountPaidCents: 0,
    });

    expect(order2).toMatchObject({
      status: "COMPLETED",
      subtotalCents: 16000,
      taxAmountCents: 1280, // 8% of $160 = $12.80
      totalAmountCents: 17280,
    });

    // Verify customer record updated
    const customerList = await operatorA.query(api.customers.listCustomers, {});
    const customerRecord = customerList.find((c) => c._id === customerId);
    expect(customerRecord?.totalPurchasesCents).toBe(10800 + 17280);
    expect(customerRecord?.totalCreditUsedCents).toBe(17280);

    // Verify inventory on hand: 15 - 8 = 7 units remaining
    const productsAfterSale2 = await operatorA.query(api.products.listProducts, {});
    const productAfterSale2 = productsAfterSale2.find((p) => p._id === productId);
    expect(productAfterSale2?.quantityOnHandGrams).toBe(7);

    // Verify FIFO batch allocations
    const batches = await t.run(async (ctx) => {
      return ctx.db
        .query("inventoryBatches")
        .withIndex("by_productId", (q) => q.eq("productId", productId))
        .collect();
    });

    const batch1 = batches.find((b) => b.lotNumber === "LOT-2026-001");
    const batch2 = batches.find((b) => b.lotNumber === "LOT-2026-002");
    // Batch 1 should be completely depleted (0 units remaining)
    expect(batch1?.remainingQuantityGrams).toBe(0);
    // Batch 2 should have 10 - 3 = 7 units remaining
    expect(batch2?.remainingQuantityGrams).toBe(7);

    // -------------------------------------------------------------------------
    // 6. Operational Reports & Daily Sales Aggregation
    // -------------------------------------------------------------------------
    const aggregateReport = await operatorA.query(
      api.reporting.getDailySalesAggregate,
      {},
    );
    expect(aggregateReport.orderCount).toBe(2);
    expect(aggregateReport.totalSubtotalCents).toBe(10000 + 16000);
    expect(aggregateReport.totalTaxCents).toBe(800 + 1280);
    expect(aggregateReport.totalRevenueCents).toBe(10800 + 17280);

    // -------------------------------------------------------------------------
    // 7. Multi-Session Persistent Visibility
    // -------------------------------------------------------------------------
    // Second authenticated session under the same business (e.g. teammate/cashier)
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "clerk_beta_operator_002",
        email: "cashier@beta.deelrx.com",
        name: "Second Operator",
        role: "CASHIER",
        businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const operatorB = t.withIdentity({
      subject: "clerk_beta_operator_002",
      email: "cashier@beta.deelrx.com",
    });

    // Session 2 should immediately see the persisted business state and catalog
    const sessionBStatus = await operatorB.query(
      api.onboarding.getCurrentOnboardingStatus,
      {},
    );
    expect(sessionBStatus).toMatchObject({
      status: "READY",
      session: {
        businessId,
        businessName: "Beta Dispensary Operations",
        roles: ["cashier"],
      },
    });

    const productsForSessionB = await operatorB.query(api.products.listProducts, {});
    const productForSessionB = productsForSessionB.find((p) => p._id === productId);
    expect(productForSessionB?.quantityOnHandGrams).toBe(7);
    expect(productForSessionB?.sellingPriceCents).toBe(2000);

    // -------------------------------------------------------------------------
    // 8. Immutable Audit Trail Verification
    // -------------------------------------------------------------------------
    const auditLogs = await t.run(async (ctx) => {
      return ctx.db
        .query("auditEvents")
        .withIndex("by_businessId", (q) => q.eq("businessId", businessId))
        .collect();
    });

    const auditActions = auditLogs.map((a) => a.action);
    expect(auditActions).toContain("BUSINESS_ONBOARDED");
    expect(auditActions).toContain("PRODUCT_CREATED");
    expect(auditActions).toContain("INVENTORY_INTAKE_RECORDED");
    expect(auditActions).toContain("POS_CHECKOUT_COMPLETED");
  });
});
