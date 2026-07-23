import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as intake from "../../convex/intake";
import * as customers from "../../convex/customers";
import * as checkout from "../../convex/checkout";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "intake.ts": async () => intake,
  "customers.ts": async () => customers,
  "checkout.ts": async () => checkout,
};

describe("Convex Phase 1 Vertical Slice Architecture Spike", () => {
  it("executes complete end-to-end business flow with atomic FIFO inventory and integer financial accounting", async () => {
    const t = convexTest(schema, modules);

    // 1. Business Onboarding
    const onboardingRes = await t.mutation(api.onboarding.createBusinessOnboarding, {
      clerkUserId: "user_test_clerk_123",
      email: "owner@drx-test.com",
      name: "Owner Test",
      businessName: "DRX Primary Dispensary",
      taxRateBps: 825, // 8.25% tax
    });

    expect(onboardingRes.status).toBe("ONBOARDING_SUCCESS");
    const businessId = onboardingRes.businessId;
    expect(businessId).toBeDefined();

    // 2. Product Catalog Creation
    const productId = await t.mutation(api.products.createProduct, {
      clerkUserId: "user_test_clerk_123",
      sku: "EXT-OG-001",
      productName: "OG Reserve Concentrate",
      sellingPriceCents: 3000, // $30.00 per gram
      unitCostCents: 1200, // $12.00 per gram
      reorderLevelGrams: 20,
    });

    expect(productId).toBeDefined();

    // 3. Batch 1 Intake (50g @ $10/g = $500 total cost = 50000 cents)
    const intake1 = await t.mutation(api.intake.recordIntake, {
      clerkUserId: "user_test_clerk_123",
      productId,
      totalWeightGrams: 50,
      totalCostCents: 50000,
      supplier: "Supplier Alpha",
    });

    expect(intake1.newStock).toBe(50);
    expect(intake1.batchId).toBeDefined();

    // 4. Batch 2 Intake (50g @ $15/g = $750 total cost = 75000 cents)
    const intake2 = await t.mutation(api.intake.recordIntake, {
      clerkUserId: "user_test_clerk_123",
      productId,
      totalWeightGrams: 50,
      totalCostCents: 75000,
      supplier: "Supplier Beta",
    });

    expect(intake2.newStock).toBe(100);

    // Verify Batches via Query
    const batches = await t.query(api.intake.getProductBatches, {
      clerkUserId: "user_test_clerk_123",
      productId,
    });
    expect(batches).toHaveLength(2);
    expect(batches[0].remainingQuantityGrams).toBe(50);
    expect(batches[1].remainingQuantityGrams).toBe(50);

    // 5. Customer Registration
    const customerId = await t.mutation(api.customers.createCustomer, {
      clerkUserId: "user_test_clerk_123",
      firstName: "Jane",
      lastName: "Doe",
      phoneNumber: "555-0199",
      email: "jane.doe@example.com",
    });
    expect(customerId).toBeDefined();

    // 6. Authoritative Checkout (Purchase 70g total -> 50g from Batch 1 (depleted), 20g from Batch 2)
    // 70g * $30.00 (3000¢) = $2,100.00 (210000¢ subtotal)
    // Tax @ 8.25% = Math.round(210000 * 825 / 10000) = 17325¢ ($173.25)
    // Total = 227325¢ ($2,273.25)
    const checkoutRes = await t.mutation(api.checkout.processCheckout, {
      clerkUserId: "user_test_clerk_123",
      customerId,
      orderNumber: "ORD-DRX-1001",
      items: [{ productId, quantityGrams: 70 }],
      paymentMethod: "cash",
      amountPaidCents: 230000, // $2,300.00
    });

    expect(checkoutRes.status).toBe("COMPLETED");
    expect(checkoutRes.subtotalCents).toBe(210000);
    expect(checkoutRes.taxAmountCents).toBe(17325);
    expect(checkoutRes.totalAmountCents).toBe(227325);
    expect(checkoutRes.changeAmountCents).toBe(230000 - 227325);

    // 7. Verify Inventory Depletion and FIFO Allocation Accuracy
    const updatedBatches = await t.query(api.intake.getProductBatches, {
      clerkUserId: "user_test_clerk_123",
      productId,
    });

    // Batch 1 should be completely depleted (0g remaining)
    expect(updatedBatches[0].remainingQuantityGrams).toBe(0);

    // Batch 2 should have 30g remaining (50g original - 20g allocated)
    expect(updatedBatches[1].remainingQuantityGrams).toBe(30);

    // Product total stock should now be 30g
    const products = await t.query(api.products.listProducts, {
      clerkUserId: "user_test_clerk_123",
    });
    expect(products[0].quantityOnHandGrams).toBe(30);

    // 8. Verify Customer Purchase Totals
    const customers = await t.query(api.customers.listCustomers, {
      clerkUserId: "user_test_clerk_123",
    });
    expect(customers[0].totalPurchasesCents).toBe(227325);
    expect(customers[0].purchaseCount).toBe(1);

    // 9. Idempotency Check (Duplicate checkout call with same order number)
    const duplicateCheckout = await t.mutation(api.checkout.processCheckout, {
      clerkUserId: "user_test_clerk_123",
      customerId,
      orderNumber: "ORD-DRX-1001",
      items: [{ productId, quantityGrams: 70 }],
      paymentMethod: "cash",
      amountPaidCents: 230000,
    });

    expect(duplicateCheckout.status).toBe("ALREADY_PROCESSED");
    expect(duplicateCheckout.totalAmountCents).toBe(227325);
  });
});
