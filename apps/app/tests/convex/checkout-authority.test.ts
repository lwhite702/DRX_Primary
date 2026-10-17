import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import * as generatedApi from "../../convex/_generated/api";
import * as checkout from "../../convex/checkout";
import * as customers from "../../convex/customers";
import * as intake from "../../convex/intake";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import schema from "../../convex/schema";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "checkout.ts": async () => checkout,
  "customers.ts": async () => customers,
  "intake.ts": async () => intake,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
};

async function setupStore(options?: {
  collectTax?: boolean;
  taxRateBps?: number;
}) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "checkout_owner",
    email: "owner@example.test",
  });
  const onboardingResult = await owner.mutation(
    api.onboarding.createBusinessOnboarding,
    {
      businessName: "Authority Test Store",
      collectTax: options?.collectTax ?? true,
      taxRateBps: options?.taxRateBps ?? 1000,
    },
  );
  return { t, owner, businessId: onboardingResult.businessId };
}

describe("authoritative Convex checkout", () => {
  it("quotes and settles exact product bundle totals from saved inventory settings", async () => {
    const { t, owner } = await setupStore({ collectTax: false });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "BUNDLE-1",
      productName: "Bundle Product",
      sellingPriceCents: 3_500,
      unitCostCents: 1_000,
      allowFractionalWeight: true,
      commerceConfig: {
        sellingUnit: "g",
        decimalPrecision: 2,
        minimumSaleQuantity: 0.5,
        quantityIncrement: 0.5,
        suggestedDollarAmounts: [],
        suggestedQuantities: [1, 2, 3.5, 7],
        bulkPriceTiers: [
          { minimumQuantity: 2, unitPriceCents: 3_000, bundlePriceCents: 6_000 },
          { minimumQuantity: 3.5, unitPriceCents: 2_571, bundlePriceCents: 9_000 },
          { minimumQuantity: 7, unitPriceCents: 2_000, bundlePriceCents: 14_000 },
        ],
      },
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 20,
      totalCostCents: 20_000,
    });

    for (const [quantityGrams, totalAmountCents] of [
      [1, 3_500],
      [2, 6_000],
      [3.5, 9_000],
      [7, 14_000],
    ]) {
      const items = [{ productId, quantityGrams }];
      const quote = await owner.query(api.checkout.quoteCheckout, { items });
      expect(quote).toMatchObject({
        totalAmountCents,
        lines: [{ lineSubtotalCents: totalAmountCents }],
      });
      const sale = await owner.mutation(api.checkout.processCheckout, {
        orderNumber: `BUNDLE-${quantityGrams}`,
        items,
        paymentMethod: "cash",
        amountPaidCents: totalAmountCents,
      });
      expect(sale).toMatchObject({ totalAmountCents, status: "COMPLETED" });
    }

    const product = await t.run((ctx) => ctx.db.get(productId));
    expect(product?.quantityOnHandGrams).toBe(6.5);
  });

  it("allows checkout operators to attribute a completed cash sale and transfers customer totals", async () => {
    const { t, owner, businessId } = await setupStore({ collectTax: false });
    const previousCustomerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "Previous",
      creditLimitCents: 5000,
    });
    const nextCustomerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "New",
      creditLimitCents: 5000,
    });
    const saleId = await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.patch(previousCustomerId, {
        totalPurchasesCents: 1100,
        loyaltyEligibleSpendCents: 800,
        purchaseCount: 1,
      });
      await ctx.db.insert("users", {
        clerkUserId: "checkout_operator",
        email: "operator@example.test",
        role: "OPERATOR",
        businessId,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("users", {
        clerkUserId: "checkout_customer_viewer",
        email: "viewer@example.test",
        role: "VIEWER",
        businessId,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
      return ctx.db.insert("sales", {
        businessId,
        customerId: previousCustomerId,
        orderNumber: "POST-SALE-CUSTOMER",
        orderStatus: "completed",
        subtotalCents: 800,
        loyaltyEligibleSpendCents: 800,
        taxAmountCents: 300,
        totalAmountCents: 1100,
        amountPaidCents: 1100,
        changeAmountCents: 0,
        paymentMethod: "cash",
        createdBy: "checkout_owner",
        createdAt: now,
        updatedAt: now,
      });
    });
    const operator = t.withIdentity({ subject: "checkout_operator", email: "operator@example.test" });
    const viewer = t.withIdentity({ subject: "checkout_customer_viewer", email: "viewer@example.test" });

    await expect(viewer.mutation(api.checkout.updateSale, { saleId, customerId: nextCustomerId })).rejects.toThrow("PROCESS_CHECKOUT");

    await operator.mutation(api.checkout.updateSale, {
      saleId,
      customerId: nextCustomerId,
    });

    const result = await t.run(async (ctx) => ({
      sale: await ctx.db.get(saleId),
      previous: await ctx.db.get(previousCustomerId),
      next: await ctx.db.get(nextCustomerId),
      audits: await ctx.db.query("auditEvents").collect(),
    }));
    expect(result.sale?.customerId).toBe(nextCustomerId);
    expect(result.sale).toMatchObject({
      subtotalCents: 800,
      taxAmountCents: 300,
      totalAmountCents: 1100,
      amountPaidCents: 1100,
      paymentMethod: "cash",
    });
    expect(result.previous).toMatchObject({ totalPurchasesCents: 0, loyaltyEligibleSpendCents: 0, purchaseCount: 0 });
    expect(result.next).toMatchObject({ totalPurchasesCents: 1100, loyaltyEligibleSpendCents: 800, purchaseCount: 1 });
    expect(result.audits.filter((event) => event.action === "SALE_UPDATED")).toHaveLength(1);
  });

  it("reassigns a manually discounted sale without leaving residual loyalty spend", async () => {
    const { t, owner } = await setupStore({ collectTax: false });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "DISC-LOYALTY-1",
      productName: "Discount Item",
      sellingPriceCents: 1000,
      unitCostCents: 400,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 5,
      totalCostCents: 2000,
    });
    const customerA = await owner.mutation(api.customers.createCustomer, { firstName: "Customer A", creditLimitCents: 0 });
    const customerB = await owner.mutation(api.customers.createCustomer, { firstName: "Customer B", creditLimitCents: 0 });

    // Process checkout with 1000-cent subtotal and 200-cent manual discount -> 800 total
    await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "MANUAL-DISC-SALE",
      customerId: customerA,
      items: [{ productId, quantityGrams: 1 }],
      discountAmountCents: 200,
      paymentMethod: "cash",
      amountPaidCents: 800,
    });

    const sale = await t.run(async (ctx) => {
      const sales = await ctx.db.query("sales").filter((q) => q.eq(q.field("orderNumber"), "MANUAL-DISC-SALE")).collect();
      return sales[0];
    });

    // Customer A after sale: subtotal 1000 - discount 200 = 800 loyalty cents
    const custABefore = await t.run((ctx) => ctx.db.get(customerA));
    expect(custABefore?.loyaltyEligibleSpendCents).toBe(800);
    expect(custABefore?.totalPurchasesCents).toBe(800);
    expect(custABefore?.purchaseCount).toBe(1);

    // Reassign sale from Customer A to Customer B
    await owner.mutation(api.checkout.updateSale, {
      saleId: sale._id,
      customerId: customerB,
    });

    // Customer A after reassignment: sole purchase was removed -> exactly 0 remaining loyalty cents
    const custAAfter = await t.run((ctx) => ctx.db.get(customerA));
    expect(custAAfter?.loyaltyEligibleSpendCents).toBe(0);
    expect(custAAfter?.totalPurchasesCents).toBe(0);
    expect(custAAfter?.purchaseCount).toBe(0);

    // Customer B after reassignment: received the 800 loyalty cents
    const custBAfter = await t.run((ctx) => ctx.db.get(customerB));
    expect(custBAfter?.loyaltyEligibleSpendCents).toBe(800);
    expect(custBAfter?.totalPurchasesCents).toBe(800);
    expect(custBAfter?.purchaseCount).toBe(1);
  });

  it("refuses post-sale customer attribution when the sale carries credit", async () => {
    const { t, owner, businessId } = await setupStore({ collectTax: false });
    const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Credit", creditLimitCents: 5000 });
    const saleId = await t.run(async (ctx) => {
      const now = Date.now();
      return ctx.db.insert("sales", {
        businessId,
        orderNumber: "POST-SALE-CREDIT",
        orderStatus: "completed",
        subtotalCents: 800,
        loyaltyEligibleSpendCents: 800,
        taxAmountCents: 0,
        totalAmountCents: 800,
        amountPaidCents: 0,
        changeAmountCents: 0,
        paymentMethod: "credit",
        creditAmountCents: 800,
        createdBy: "checkout_owner",
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(owner.mutation(api.checkout.updateSale, { saleId, customerId })).rejects.toThrow("Credit sale customer reassignment requires reconciliation");
    expect((await t.run((ctx) => ctx.db.get(saleId)))?.customerId).toBeUndefined();
  });

  it("derives prices and product taxability on the server and requires exact card settlement", async () => {
    const { owner } = await setupStore();
    const taxableProductId = await owner.mutation(api.products.createProduct, {
      sku: "TAX-1",
      productName: "Taxable Product",
      sellingPriceCents: 1000,
      unitCostCents: 400,
      isTaxable: true,
    });
    const exemptProductId = await owner.mutation(api.products.createProduct, {
      sku: "EXEMPT-1",
      productName: "Exempt Product",
      sellingPriceCents: 500,
      unitCostCents: 200,
      isTaxable: false,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: taxableProductId,
      totalWeightGrams: 10,
      totalCostCents: 4000,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: exemptProductId,
      totalWeightGrams: 10,
      totalCostCents: 2000,
    });

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "CARD-UNDERPAID",
        items: [
          { productId: taxableProductId, quantityGrams: 1 },
          { productId: exemptProductId, quantityGrams: 1 },
        ],
        paymentMethod: "card",
        amountPaidCents: 1500,
      }),
    ).rejects.toThrow("Card tender amount must equal");

    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "CARD-SETTLED",
      items: [
        { productId: taxableProductId, quantityGrams: 1 },
        { productId: exemptProductId, quantityGrams: 1 },
      ],
      paymentMethod: "card",
      amountPaidCents: 1600,
    });

    expect(result).toMatchObject({
      subtotalCents: 1500,
      taxableSubtotalCents: 1000,
      taxAmountCents: 100,
      totalAmountCents: 1600,
      changeAmountCents: 0,
    });
  });

  it("deduplicates exact retries and rejects order-number reuse with a changed payload", async () => {
    const { t, owner } = await setupStore({ collectTax: false });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "IDEMPOTENT-1",
      productName: "Idempotent Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 10,
      totalCostCents: 5000,
    });
    const input = {
      orderNumber: "IDEMPOTENT-ORDER",
      items: [{ productId, quantityGrams: 2 }],
      paymentMethod: "cash" as const,
      amountPaidCents: 2000,
    };

    const first = await owner.mutation(api.checkout.processCheckout, input);
    const retry = await owner.mutation(api.checkout.processCheckout, input);
    expect(retry).toMatchObject({
      saleId: first.saleId,
      status: "ALREADY_PROCESSED",
      totalAmountCents: 2000,
    });

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        ...input,
        items: [{ productId, quantityGrams: 3 }],
        amountPaidCents: 3000,
      }),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");

    const records = await t.run(async (ctx) => ({
      sales: await ctx.db.query("sales").collect(),
      audits: await ctx.db.query("auditEvents").collect(),
      product: await ctx.db.get(productId),
    }));
    expect(records.sales).toHaveLength(1);
    expect(
      records.audits.filter(
        (audit) => audit.action === "POS_CHECKOUT_COMPLETED",
      ),
    ).toHaveLength(1);
    expect(records.product?.quantityOnHandGrams).toBe(8);
  });

  it("deduplicates exact retries of legacy sales without stored fingerprints", async () => {
    const { t, owner, businessId } = await setupStore({ collectTax: false });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "LEGACY-1",
      productName: "Legacy Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    const saleId = await t.run(async (ctx) => {
      const now = Date.now();
      const id = await ctx.db.insert("sales", {
        businessId,
        orderNumber: " LEGACY-ORDER ",
        orderStatus: "completed",
        subtotalCents: 1000,
        taxAmountCents: 0,
        totalAmountCents: 1000,
        amountPaidCents: 1000,
        changeAmountCents: 0,
        paymentMethod: "cash",
        createdBy: "checkout_owner",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("salesLineItems", {
        saleId: id,
        productId,
        quantityGrams: 1,
        unitPriceCents: 1000,
        lineTotalCents: 1000,
        unitCostCents: 500,
        createdAt: now,
      });
      return id;
    });

    const retry = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: " LEGACY-ORDER ",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1000,
    });
    expect(retry).toMatchObject({ saleId, status: "ALREADY_PROCESSED" });

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: " LEGACY-ORDER ",
        items: [{ productId, quantityGrams: 2 }],
        paymentMethod: "cash",
        amountPaidCents: 2000,
      }),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  });

  it("rejects positive quantities that round to a zero-cent line", async () => {
    const { t, owner } = await setupStore({ collectTax: false });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "TINY-1",
      productName: "Tiny Fraction Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
      allowFractionalWeight: true,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 1,
      totalCostCents: 500,
    });

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "ZERO-CENT-LINE",
        items: [{ productId, quantityGrams: 0.0001 }],
        paymentMethod: "cash",
        amountPaidCents: 0,
      }),
    ).rejects.toThrow("Calculated line total");

    const records = await t.run(async (ctx) => ({
      sales: await ctx.db.query("sales").collect(),
      product: await ctx.db.get(productId),
    }));
    expect(records.sales).toHaveLength(0);
    expect(records.product?.quantityOnHandGrams).toBe(1);
  });

  it("preserves zero as the unlimited customer-credit sentinel", async () => {
    const { t, owner } = await setupStore({ collectTax: false });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "UNLIMITED-CREDIT-1",
      productName: "Unlimited Credit Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 1,
      totalCostCents: 500,
    });
    const customerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "Unlimited",
      creditLimitCents: 0,
    });

    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "UNLIMITED-CREDIT",
      customerId,
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "credit",
      amountPaidCents: 0,
    });
    expect(result).toMatchObject({
      status: "COMPLETED",
      totalAmountCents: 1000,
    });
    const customer = await t.run((ctx) => ctx.db.get(customerId));
    expect(customer?.totalCreditUsedCents).toBe(1000);
  });

  it("enforces tenant, permission, quantity, stock, and credit boundaries atomically", async () => {
    const { t, owner, businessId } = await setupStore({ collectTax: false });
    const unitProductId = await owner.mutation(api.products.createProduct, {
      sku: "UNIT-1",
      productName: "Whole Unit Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
      allowFractionalWeight: false,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: unitProductId,
      totalWeightGrams: 2,
      totalCostCents: 1000,
    });
    const limitedCustomerId = await owner.mutation(
      api.customers.createCustomer,
      { firstName: "Limited Credit", creditLimitCents: 500 },
    );

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "checkout_viewer",
        email: "viewer@example.test",
        role: "VIEWER",
        businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const viewer = t.withIdentity({
      subject: "checkout_viewer",
      email: "viewer@example.test",
    });
    await expect(
      viewer.mutation(api.checkout.processCheckout, {
        orderNumber: "NO-PERMISSION",
        items: [{ productId: unitProductId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("PROCESS_CHECKOUT");

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "FRACTIONAL-UNIT",
        items: [{ productId: unitProductId, quantityGrams: 0.5 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("whole-unit quantity");
    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "NO-CREDIT-LIMIT",
        customerId: limitedCustomerId,
        items: [{ productId: unitProductId, quantityGrams: 1 }],
        paymentMethod: "credit",
        amountPaidCents: 0,
      }),
    ).rejects.toThrow("CREDIT_LIMIT_EXCEEDED");
    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "INSUFFICIENT-STOCK",
        items: [{ productId: unitProductId, quantityGrams: 3 }],
        paymentMethod: "cash",
        amountPaidCents: 3000,
      }),
    ).rejects.toThrow("INSUFFICIENT_STOCK");

    const otherOwner = t.withIdentity({
      subject: "checkout_other_owner",
      email: "other@example.test",
    });
    await otherOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Other Store",
      collectTax: false,
    });
    const foreignProductId = await otherOwner.mutation(
      api.products.createProduct,
      {
        sku: "FOREIGN-1",
        productName: "Foreign Product",
        sellingPriceCents: 1000,
        unitCostCents: 500,
      },
    );
    const foreignCustomerId = await otherOwner.mutation(
      api.customers.createCustomer,
      { firstName: "Foreign Customer", creditLimitCents: 5000 },
    );
    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "FOREIGN-CUSTOMER",
        customerId: foreignCustomerId,
        items: [{ productId: unitProductId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("Customer");
    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "FOREIGN-PRODUCT",
        items: [{ productId: foreignProductId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("Product");

    const records = await t.run(async (ctx) => ({
      sales: await ctx.db.query("sales").collect(),
      product: await ctx.db.get(unitProductId),
      customer: await ctx.db.get(limitedCustomerId),
    }));
    expect(records.sales).toHaveLength(0);
    expect(records.product?.quantityOnHandGrams).toBe(2);
    expect(records.customer).toMatchObject({
      totalPurchasesCents: 0,
      totalCreditUsedCents: 0,
      purchaseCount: 0,
    });
  });

  it("applies checkout discounts across quote and settlement with tax recalculation", async () => {
    const { owner } = await setupStore({ collectTax: true, taxRateBps: 1000 }); // 10% tax
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "DISC-1",
      productName: "Discountable Item",
      sellingPriceCents: 2000,
      unitCostCents: 800,
      isTaxable: true,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 5,
      totalCostCents: 4000,
    });

    // 1 item = $20.00 base. With $5.00 discount (500 cents):
    // discounted subtotal = $15.00 (1500 cents)
    // 10% tax on $15.00 = $1.50 (150 cents)
    // total = $16.50 (1650 cents)
    const quote = await owner.query(api.checkout.quoteCheckout, {
      items: [{ productId, quantityGrams: 1 }],
      discountAmountCents: 500,
    });

    expect(quote.discountCents).toBe(500);
    expect(quote.subtotalCents).toBe(2000);
    expect(quote.taxAmountCents).toBe(150);
    expect(quote.totalAmountCents).toBe(1650);

    // Negative discount is rejected
    await expect(
      owner.query(api.checkout.quoteCheckout, {
        items: [{ productId, quantityGrams: 1 }],
        discountAmountCents: -100,
      }),
    ).rejects.toThrow();

    // Process checkout with same discount succeeds with exact payment
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DISCOUNTED-ORDER-1",
      items: [{ productId, quantityGrams: 1 }],
      discountAmountCents: 500,
      paymentMethod: "cash",
      amountPaidCents: 1650,
    });

    expect(checkoutResult.totalAmountCents).toBe(1650);
    expect(checkoutResult.subtotalCents).toBe(2000);
    expect(checkoutResult.taxAmountCents).toBe(150);
  });

  it("does not tax non-taxable merchandise when a discount is applied", async () => {
    const { owner } = await setupStore({ collectTax: true, taxRateBps: 1000 }); // 10% tax
    const nonTaxableId = await owner.mutation(api.products.createProduct, {
      sku: "NON-TAX-1",
      productName: "Non-Taxable Merchandise",
      sellingPriceCents: 2000,
      unitCostCents: 800,
      isTaxable: false,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: nonTaxableId,
      totalWeightGrams: 5,
      totalCostCents: 4000,
    });

    // 1 non-taxable item = $20.00. With $5.00 discount (500 cents):
    // discounted subtotal = $15.00 (1500 cents)
    // tax must be $0.00 (0 cents)
    // total = $15.00 (1500 cents)
    const quote = await owner.query(api.checkout.quoteCheckout, {
      items: [{ productId: nonTaxableId, quantityGrams: 1 }],
      discountAmountCents: 500,
    });

    expect(quote.discountCents).toBe(500);
    expect(quote.subtotalCents).toBe(2000);
    expect(quote.taxAmountCents).toBe(0);
    expect(quote.merchandiseTaxCents).toBe(0);
    expect(quote.totalAmountCents).toBe(1500);

    // Settlement must also have zero tax
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "NON-TAX-DISCOUNTED-ORDER",
      items: [{ productId: nonTaxableId, quantityGrams: 1 }],
      discountAmountCents: 500,
      paymentMethod: "cash",
      amountPaidCents: 1500,
    });

    expect(checkoutResult.totalAmountCents).toBe(1500);
    expect(checkoutResult.subtotalCents).toBe(2000);
    expect(checkoutResult.taxAmountCents).toBe(0);
    expect(checkoutResult.merchandiseTaxCents).toBe(0);
  });

  it("proportionally taxes only the taxable portion in a mixed discounted cart and rejects excess discounts", async () => {
    const { owner } = await setupStore({ collectTax: true, taxRateBps: 1000 }); // 10% tax
    const taxableId = await owner.mutation(api.products.createProduct, {
      sku: "TAX-MIX-1",
      productName: "Taxable Item",
      sellingPriceCents: 2000,
      unitCostCents: 800,
      isTaxable: true,
    });
    const nonTaxableId = await owner.mutation(api.products.createProduct, {
      sku: "NON-TAX-MIX-1",
      productName: "Non-Taxable Item",
      sellingPriceCents: 2000,
      unitCostCents: 800,
      isTaxable: false,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: taxableId,
      totalWeightGrams: 5,
      totalCostCents: 4000,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: nonTaxableId,
      totalWeightGrams: 5,
      totalCostCents: 4000,
    });

    // Subtotal: $40.00 (2000 + 2000). Discount: $10.00 (1000 cents).
    // Discounted subtotal: $30.00 (3000 cents). Ratio: 3000 / 4000 = 0.75.
    // Discounted taxable merchandise: 2000 * 0.75 = 1500 cents ($15.00).
    // 10% tax on $15.00 = 150 cents ($1.50). Total = $31.50 (3150 cents).
    const quote = await owner.query(api.checkout.quoteCheckout, {
      items: [
        { productId: taxableId, quantityGrams: 1 },
        { productId: nonTaxableId, quantityGrams: 1 },
      ],
      discountAmountCents: 1000,
    });

    expect(quote.discountCents).toBe(1000);
    expect(quote.subtotalCents).toBe(4000);
    expect(quote.taxAmountCents).toBe(150);
    expect(quote.totalAmountCents).toBe(3150);

    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "MIXED-DISCOUNTED-ORDER",
      items: [
        { productId: taxableId, quantityGrams: 1 },
        { productId: nonTaxableId, quantityGrams: 1 },
      ],
      discountAmountCents: 1000,
      paymentMethod: "cash",
      amountPaidCents: 3150,
    });

    expect(checkoutResult.totalAmountCents).toBe(3150);
    expect(checkoutResult.subtotalCents).toBe(4000);
    expect(checkoutResult.taxAmountCents).toBe(150);

    // Excess discount exceeding merchandise subtotal is rejected
    await expect(
      owner.query(api.checkout.quoteCheckout, {
        items: [{ productId: taxableId, quantityGrams: 1 }],
        discountAmountCents: 2500, // subtotal is 2000
      }),
    ).rejects.toThrow("INVALID_ARGUMENT: Discount cannot exceed subtotal");

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "EXCESS-DISCOUNT-ORDER",
        items: [{ productId: taxableId, quantityGrams: 1 }],
        discountAmountCents: 2500,
        paymentMethod: "cash",
        amountPaidCents: 0,
      }),
    ).rejects.toThrow("INVALID_ARGUMENT: Discount cannot exceed subtotal");
  });
});
