import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generatedApi from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as customers from "../../convex/customers";
import * as checkout from "../../convex/checkout";
import * as reporting from "../../convex/reporting";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "customers.ts": async () => customers, "checkout.ts": async () => checkout, "reporting.ts": async () => reporting };
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "settlement-owner", email: "owner@example.invalid" });
  await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic settlement", collectTax: true, taxRateBps: 1000 });
  const productId = await owner.mutation(api.products.createProduct, { sku: "SETTLE", productName: "Synthetic", sellingPriceCents: 1000, unitCostCents: 200, initialQuantity: 10 });
  const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Synthetic", creditLimitCents: 700 });
  return { t, owner, productId, customerId, items: [{ productId, quantityGrams: 1 }] };
}
it("includes fees in quote, settlement, stored sale and reported revenue without taxing them as merchandise", async () => {
  const { t, owner, items } = await fixture();
  const fees = [{ type: "Service", amountCents: 150, value: "Synthetic reference" }];
  const quote = await owner.query(api.checkout.quoteCheckout, { items, fees });
  expect(quote).toMatchObject({ subtotalCents: 1000, taxAmountCents: 100, totalAmountCents: 1250 });
  const result = await owner.mutation(api.checkout.processCheckout, { items, fees, orderNumber: "WEB-FEES", paymentMethod: "zelle", paymentReference: "SYNTHETIC-REF", amountPaidCents: 1250 });
  const sale = await t.run(ctx => ctx.db.get(result.saleId));
  expect(sale).toMatchObject({ fees, feeRevenueCents: 150, paymentReference: "SYNTHETIC-REF", creditAmountCents: 0, changeAmountCents: 0 });
  const report = await owner.query(api.reporting.getSalesAggregate, { startAt: sale!.createdAt, endAt: sale!.createdAt + 1, timezone: "UTC" });
  expect(report).toMatchObject({ merchandiseRevenueCents: 1000, feeRevenueCents: 150, netRevenueCents: 1150, grossProfitCents: 950 });
  expect(await owner.query(api.checkout.getSalesHistory, {})).toHaveLength(1);
  const audit = await t.run(ctx => ctx.db.query("auditEvents").collect());
  expect(JSON.stringify(audit)).not.toContain("SYNTHETIC-REF");
  expect(JSON.stringify(audit)).not.toContain("Synthetic reference");
});
it("atomically assigns only the mixed-payment remainder to credit and replays once", async () => {
  const { t, owner, items, customerId, productId } = await fixture();
  const input = { items, customerId, orderNumber: "WEB-MIXED", paymentMethod: "mixed" as const, amountPaidCents: 500, fees: [{ type: "Service", amountCents: 50 }] };
  const first = await owner.mutation(api.checkout.processCheckout, input);
  expect((await owner.mutation(api.checkout.processCheckout, input)).saleId).toBe(first.saleId);
  const state = await t.run(async ctx => ({ customer: await ctx.db.get(customerId), product: await ctx.db.get(productId), sale: await ctx.db.get(first.saleId) }));
  expect(state.customer?.totalCreditUsedCents).toBe(650);
  expect(state.product?.quantityOnHandGrams).toBe(9);
  expect(state.sale?.creditAmountCents).toBe(650);
  const stockAudit = await t.run(async ctx => (await ctx.db.query("auditEvents").collect()).filter(event => event.action === "INVENTORY_SOLD"));
  expect(stockAudit).toHaveLength(1);
  expect(JSON.parse(stockAudit[0].metadata!)).toMatchObject({ delta: -1, quantity: 9 });
  await expect(owner.mutation(api.checkout.processCheckout, { ...input, fees: [{ type: "Different", amountCents: 50 }] })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  await expect(owner.mutation(api.checkout.processCheckout, { ...input, paymentReference: "DIFFERENT" })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
});
it("rolls back stock, sales and balances when the mixed remainder exceeds credit", async () => {
  const { t, owner, items, customerId, productId } = await fixture();
  await expect(owner.mutation(api.checkout.processCheckout, { items, customerId, orderNumber: "OVER-LIMIT", paymentMethod: "mixed", amountPaidCents: 100 })).rejects.toThrow(/CREDIT_LIMIT_EXCEEDED/);
  const state = await t.run(async ctx => ({ customer: await ctx.db.get(customerId), product: await ctx.db.get(productId), sales: await ctx.db.query("sales").collect() }));
  expect(state.customer?.totalCreditUsedCents).toBe(0);
  expect(state.product?.quantityOnHandGrams).toBe(10);
  expect(state.sales).toHaveLength(0);
});
it.each([0, 1200])("rejects an invalid mixed tender of %s cents", async amountPaidCents => {
  const { owner, items, customerId } = await fixture();
  await expect(owner.mutation(api.checkout.processCheckout, { items, customerId, orderNumber: "BAD-MIXED", paymentMethod: "mixed", amountPaidCents })).rejects.toThrow(/PAYMENT_ERROR/);
});
it("requires an owned active customer for mixed payments", async () => {
  const { t, owner, items, customerId } = await fixture();
  await expect(owner.mutation(api.checkout.processCheckout, { items, orderNumber: "NO-CUSTOMER", paymentMethod: "mixed", amountPaidCents: 500 })).rejects.toThrow(/require a customer/);
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false }));
  await expect(owner.mutation(api.checkout.processCheckout, { items, customerId, orderNumber: "INACTIVE", paymentMethod: "mixed", amountPaidCents: 500 })).rejects.toThrow(/inactive/);
});
it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid fee cents %s", async amountCents => {
  const { owner, items } = await fixture();
  await expect(owner.query(api.checkout.quoteCheckout, { items, fees: [{ type: "Service", amountCents }] })).rejects.toThrow(/INVALID_ARGUMENT/);
});
it("requires exact Zelle settlement and preserves old native retry fingerprints", async () => {
  const { owner, items } = await fixture();
  await expect(owner.mutation(api.checkout.processCheckout, { items, orderNumber: "ZELLE", paymentMethod: "zelle", amountPaidCents: 1200 })).rejects.toThrow(/PAYMENT_ERROR/);
  const input = { items, orderNumber: "NATIVE-RETRY", paymentMethod: "cash" as const, amountPaidCents: 1200 };
  const first = await owner.mutation(api.checkout.processCheckout, input);
  expect((await owner.mutation(api.checkout.processCheckout, { ...input, fees: [] })).saleId).toBe(first.saleId);
});

it("allows fully settled mixed tender without a credit customer", async () => {
  const { owner, items } = await fixture();
  const result = await owner.mutation(api.checkout.processCheckout, { items, orderNumber: "MIXED-SETTLED", paymentMethod: "mixed", amountPaidCents: 1100 });
  expect(result).toMatchObject({ totalAmountCents: 1100, changeAmountCents: 0 });
});

it("atomically records credit ledger entries for split store-credit tenders and enforces limits", async () => {
  const { t, owner, items, customerId } = await fixture();
  // Total is 1100 (1000 subtotal + 100 tax). Credit limit is 700.
  // Split: 600 cash + 500 credit = 1100 total.
  const splitTenders = [
    { method: "cash" as const, amountCents: 600 },
    { method: "credit" as const, amountCents: 500 },
  ];
  const result = await owner.mutation(api.checkout.processCheckout, {
    items,
    customerId,
    orderNumber: "SPLIT-CREDIT-1",
    paymentMethod: "split",
    amountPaidCents: 1100,
    paymentTenders: splitTenders,
  });
  expect(result.status).toBe("COMPLETED");

  const state = await t.run(async ctx => ({
    customer: await ctx.db.get(customerId),
    sale: await ctx.db.get(result.saleId),
    saleLedgerEntries: (await ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customerId)).collect()).filter(e => e.kind === "sale"),
  }));
  expect(state.customer?.totalCreditUsedCents).toBe(500);
  expect(state.sale?.creditAmountCents).toBe(500);
  expect(state.saleLedgerEntries).toHaveLength(1);
  expect(state.saleLedgerEntries[0]).toMatchObject({
    kind: "sale",
    deltaCents: 500,
    balanceAfterCents: 500,
    saleId: result.saleId,
  });

  // Second split tender trying to use 300 credit (500 + 300 = 800 > limit 700) should be rejected
  const overLimitTenders = [
    { method: "cash" as const, amountCents: 800 },
    { method: "credit" as const, amountCents: 300 },
  ];
  await expect(
    owner.mutation(api.checkout.processCheckout, {
      items,
      customerId,
      orderNumber: "SPLIT-OVER-LIMIT",
      paymentMethod: "split",
      amountPaidCents: 1100,
      paymentTenders: overLimitTenders,
    }),
  ).rejects.toThrow(/CREDIT_LIMIT_EXCEEDED/);
});

