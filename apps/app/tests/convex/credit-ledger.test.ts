import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as credit from "../../convex/credit";
import * as customers from "../../convex/customers";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
import * as checkout from "../../convex/checkout";
import * as products from "../../convex/products";
const modules = { "checkout.ts": async () => checkout, "products.ts": async () => products, "credit.ts": async () => credit, "customers.ts": async () => customers, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated };
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "ledger-owner" });
  await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic ledger" });
  const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Synthetic", creditLimitCents: 10000 });
  return { t, owner, customerId };
}
describe("durable credit ledger", () => {
  it("records a checkout debt once and preserves it after payment and checkout replay", async () => {
    const { t, owner, customerId } = await fixture();
    const productId = await owner.mutation(api.products.createProduct, { productName: "Synthetic stock", sku: "LEDGER", sellingPriceCents: 1000, unitCostCents: 500, initialQuantity: 5 });
    const args = { orderNumber: "credit-order-1", customerId, items: [{ productId, quantityGrams: 1 }], paymentMethod: "credit" as const, amountPaidCents: 0 };
    const sale = await owner.mutation(api.checkout.processCheckout, args);
    await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 100, requestKey: "sale-payment-1" });
    await owner.mutation(api.checkout.processCheckout, args);
    const rows = await t.run(ctx => ctx.db.query("creditEntries").collect());
    expect(rows.filter(row => row.kind === "sale")).toHaveLength(1);
    expect(rows.find(row => row.kind === "sale")?.saleId).toBe(sale.saleId);
    expect((await t.run(ctx => ctx.db.get(customerId)))?.totalCreditUsedCents).toBe(sale.totalAmountCents - 100);
  });
  it("records opening, issue and payment once and returns original retry results", async () => {
    const { t, owner, customerId } = await fixture();
    await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: 500 }));
    const issue = { customerId, amountCents: 1000, requestKey: "issue-0001" };
    expect((await owner.mutation(api.credit.issueCustomerCredit, issue)).newCreditUsedCents).toBe(1500);
    const payment = { customerId, paymentAmountCents: 300, requestKey: "payment-0001" };
    await owner.mutation(api.credit.recordCreditPayment, payment);
    expect((await owner.mutation(api.credit.issueCustomerCredit, issue)).newCreditUsedCents).toBe(1500);
    await owner.mutation(api.credit.recordCreditPayment, payment);
    const rows = await t.run(ctx => ctx.db.query("creditEntries").collect());
    expect(rows.map(row => row.deltaCents)).toEqual([500, 1000, -300]);
    expect(rows[0].openingSource).toBe("existing_customer_balance_unreconciled");
    expect((await t.run(ctx => ctx.db.get(customerId)))?.totalCreditUsedCents).toBe(1200);
    expect((await t.run(ctx => ctx.db.query("creditAccounts").first()))?.balanceCents).toBe(1200);
  });
  it("rejects changed retry amounts and cross-operation keys", async () => {
    const { owner, customerId } = await fixture();
    await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 1000, requestKey: "shared-0001" });
    await expect(owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 1001, requestKey: "shared-0001" })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
    await expect(owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 1000, requestKey: "shared-0001" })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  });
  it("rejects invalid cents and overpayments without creating entries", async () => {
    const { t, owner, customerId } = await fixture();
    for (const amount of [-1, 0, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: amount })).rejects.toThrow(/INVALID_ARGUMENT/);
      await expect(owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: amount })).rejects.toThrow(/INVALID_ARGUMENT/);
    }
    await expect(owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 1 })).rejects.toThrow(/PAYMENT_ERROR/);
    await expect(owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 10001 })).rejects.toThrow(/CREDIT_LIMIT_EXCEEDED/);
    expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toEqual([]);
  });
  it("denies another tenant and detects an out-of-ledger balance change", async () => {
    const { t, owner, customerId } = await fixture();
    const other = t.withIdentity({ subject: "ledger-other" });
    await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
    await expect(other.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100 })).rejects.toThrow(/NOT_FOUND/);
    await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100 });
    await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: 90 }));
    await expect(owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 10 })).rejects.toThrow(/reconciliation/);
    expect((await t.run(ctx => ctx.db.query("creditEntries").collect())).length).toBe(2);
  });
});
