import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

import * as checkout from "../../convex/checkout";
import * as credit from "../../convex/credit";
import * as customers from "../../convex/customers";
import * as intake from "../../convex/intake";
import * as inventoryAdjustments from "../../convex/inventoryAdjustments";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as refunds from "../../convex/refunds";
import * as reporting from "../../convex/reporting";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "checkout.ts": async () => checkout,
  "credit.ts": async () => credit,
  "customers.ts": async () => customers,
  "intake.ts": async () => intake,
  "inventoryAdjustments.ts": async () => inventoryAdjustments,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "refunds.ts": async () => refunds,
  "reporting.ts": async () => reporting,
};

describe("financial and inventory integrity contracts", () => {
  it("restricts checkout overrides and customer attachment to the active tenant", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "owner_override",
      email: "owner@example.com",
    });
    const onboardingResult = await owner.mutation(
      api.onboarding.createBusinessOnboarding,
      {
        businessName: "Override Store",
        collectTax: false,
      },
    );
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "OVERRIDE-1",
      productName: "Override Product",
      sellingPriceCents: 1000,
      unitCostCents: 400,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 20,
      totalCostCents: 8000,
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "member_override",
        email: "member@example.com",
        role: "MEMBER",
        businessId: onboardingResult.businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const member = t.withIdentity({
      subject: "member_override",
      email: "member@example.com",
    });

    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "NEGATIVE-FEE",
        items: [{ productId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
        deliveryFeeCents: -1,
      }),
    ).rejects.toThrow("nonnegative integer");
    await expect(
      member.mutation(api.checkout.processCheckout, {
        orderNumber: "MEMBER-DISCOUNT",
        items: [{ productId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
        discountAmountCents: 100,
      }),
    ).rejects.toThrow("APPLY_CHECKOUT_OVERRIDE");

    const discounted = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "OWNER-DISCOUNT",
      items: [{ productId, quantityGrams: 2 }],
      paymentMethod: "cash",
      amountPaidCents: 2000,
      discountAmountCents: 200,
      deliveryFeeCents: 100,
    });
    expect(discounted).toMatchObject({
      subtotalCents: 2000,
      taxAmountCents: 0,
      totalAmountCents: 1900,
    });

    const comp = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "OWNER-COMP",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "comp",
      amountPaidCents: 0,
      isComp: true,
    });
    expect(comp.totalAmountCents).toBe(0);

    const otherOwner = t.withIdentity({
      subject: "other_owner",
      email: "other@example.com",
    });
    await otherOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Other Store",
      collectTax: false,
    });
    const otherCustomerId = await otherOwner.mutation(
      api.customers.createCustomer,
      {
        firstName: "Other",
        lastName: "Customer",
      },
    );
    await expect(
      owner.mutation(api.checkout.processCheckout, {
        customerId: otherCustomerId,
        orderNumber: "CROSS-TENANT-CUSTOMER",
        items: [{ productId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("Customer");
  });

  it("bounds stock adjustments and reports only server-derived loss classifications", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "owner_adjust",
      email: "adjust@example.com",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Adjustment Store",
      collectTax: false,
    });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "ADJUST-1",
      productName: "Adjusted Product",
      sellingPriceCents: 2000,
      unitCostCents: 1000,
    });
    const otherProductId = await owner.mutation(api.products.createProduct, {
      sku: "ADJUST-2",
      productName: "Other Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    const intakeResult = await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 10,
      totalCostCents: 10000,
    });

    await expect(
      owner.mutation(api.inventoryAdjustments.createStockAdjustment, {
        productId: otherProductId,
        batchId: intakeResult.batchId,
        adjustmentType: "shrinkage",
        direction: "decrease",
        quantityGrams: 1,
        notes: "Mismatch attempt",
      }),
    ).rejects.toThrow("Batch does not belong");
    await expect(
      owner.mutation(api.inventoryAdjustments.createStockAdjustment, {
        productId,
        batchId: intakeResult.batchId,
        adjustmentType: "damage",
        direction: "decrease",
        quantityGrams: 11,
        notes: "Too much",
      }),
    ).rejects.toThrow("INSUFFICIENT_STOCK");

    const shrink = await owner.mutation(
      api.inventoryAdjustments.createStockAdjustment,
      {
        productId,
        batchId: intakeResult.batchId,
        adjustmentType: "shrinkage",
        direction: "decrease",
        quantityGrams: 2,
        notes: "Counted damaged during close",
      },
    );
    expect(shrink.costLossCents).toBe(2000);
    const recount = await owner.mutation(
      api.inventoryAdjustments.createStockAdjustment,
      {
        productId,
        batchId: intakeResult.batchId,
        adjustmentType: "recount",
        direction: "decrease",
        quantityGrams: 1,
        notes: "Corrected prior count",
      },
    );
    expect(recount.costLossCents).toBe(0);

    const report = await owner.query(api.reporting.getFinancialReport, {});
    expect(report.inventoryLossCents).toBe(2000);
    expect(report.shrinkLossCents).toBe(2000);
    const productList = await owner.query(api.products.listProducts, {});
    expect(
      productList.find((product) => product._id === productId)
        ?.quantityOnHandGrams,
    ).toBe(7);
  });

  it("requires tender settlement and makes restock, scrap, credit, and void outcomes idempotent", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "owner_returns",
      email: "returns@example.com",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Returns Store",
      collectTax: false,
    });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "RETURN-1",
      productName: "Return Product",
      sellingPriceCents: 2000,
      unitCostCents: 1000,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 20,
      totalCostCents: 20000,
    });

    const cashSale = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "RETURN-CASH",
      items: [{ productId, quantityGrams: 2 }],
      paymentMethod: "cash",
      amountPaidCents: 4000,
    });
    const otherOwner = t.withIdentity({
      subject: "other_return_owner",
      email: "other-return@example.com",
    });
    await otherOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Other Returns Store",
      collectTax: false,
    });
    await expect(
      otherOwner.mutation(api.refunds.refundOrder, {
        saleId: cashSale.saleId,
        reason: "Cross-tenant attempt",
        disposition: "restock",
        tenderRefundConfirmed: true,
      }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      owner.mutation(api.refunds.refundOrder, {
        saleId: cashSale.saleId,
        reason: "Customer return",
        disposition: "restock",
      }),
    ).rejects.toThrow("SETTLEMENT_REQUIRED");
    const cashRefund = await owner.mutation(api.refunds.refundOrder, {
      saleId: cashSale.saleId,
      reason: "Customer return",
      disposition: "restock",
      tenderRefundConfirmed: true,
    });
    expect(cashRefund).toMatchObject({
      status: "REFUNDED",
      restoredAllocations: 1,
    });
    expect(
      await owner.mutation(api.refunds.refundOrder, {
        saleId: cashSale.saleId,
        reason: "Retry",
        disposition: "restock",
        tenderRefundConfirmed: true,
      }),
    ).toMatchObject({ status: "ALREADY_REFUNDED" });

    const cardSale = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "RETURN-CARD",
      items: [{ productId, quantityGrams: 3 }],
      paymentMethod: "card",
      amountPaidCents: 6000,
    });
    await expect(
      owner.mutation(api.refunds.refundOrder, {
        saleId: cardSale.saleId,
        reason: "Damaged return",
        disposition: "scrap",
        tenderRefundConfirmed: true,
      }),
    ).rejects.toThrow("external reference");
    await owner.mutation(api.refunds.refundOrder, {
      saleId: cardSale.saleId,
      reason: "Damaged return",
      disposition: "scrap",
      tenderRefundConfirmed: true,
      externalReference: "processor-ref-123",
    });

    const customerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "Credit",
      lastName: "Customer",
      creditLimitCents: 10000,
    });
    const creditSale = await owner.mutation(api.checkout.processCheckout, {
      customerId,
      orderNumber: "RETURN-CREDIT",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "credit",
      amountPaidCents: 0,
    });
    await owner.mutation(api.refunds.refundOrder, {
      saleId: creditSale.saleId,
      reason: "Credit order reversed",
      disposition: "restock",
    });
    expect(
      (await owner.query(api.customers.listCustomers, {}))[0],
    ).toMatchObject({
      totalCreditUsedCents: 0,
      totalPurchasesCents: 0,
      purchaseCount: 0,
    });
    // Verify credit ledger is not desynchronized and subsequent credit actions succeed
    await owner.mutation(api.credit.issueCustomerCredit, {
      customerId,
      amountCents: 500,
    });
    expect(
      (await owner.query(api.customers.listCustomers, {}))[0].totalCreditUsedCents,
    ).toBe(500);

    const voidSale = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "VOID-CASH",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 2000,
    });
    expect(
      await owner.mutation(api.refunds.voidOrder, {
        saleId: voidSale.saleId,
        reason: "Entry error",
        tenderReversalConfirmed: true,
      }),
    ).toMatchObject({ status: "VOIDED", restoredAllocations: 1 });
    expect(
      await owner.mutation(api.refunds.voidOrder, {
        saleId: voidSale.saleId,
        reason: "Retry",
        tenderReversalConfirmed: true,
      }),
    ).toMatchObject({ status: "ALREADY_VOIDED" });

    const report = await owner.query(api.reporting.getFinancialReport, {});
    expect(report.orderCount).toBe(0);
    expect(report.refundedScrapLossCents).toBe(3000);
    expect(report.shrinkLossCents).toBe(3000);
    const records = await t.run(async (ctx) => ({
      sales: await ctx.db.query("sales").collect(),
      audits: await ctx.db.query("auditEvents").collect(),
    }));
    expect(
      records.sales.filter((sale) => sale.orderStatus === "refunded"),
    ).toHaveLength(3);
    expect(
      records.sales.filter((sale) => sale.orderStatus === "cancelled"),
    ).toHaveLength(1);
    expect(
      records.audits.filter((audit) => audit.action === "POS_ORDER_REFUNDED"),
    ).toHaveLength(3);
    expect(
      records.audits.filter((audit) => audit.action === "POS_ORDER_VOIDED"),
    ).toHaveLength(1);
  });

  it("handles split tenders, P2P methods, and active delivery cancellation on void and refund", async () => {
    process.env.DRX_PII_KEY_CURRENT_B64 = Buffer.alloc(32, 7).toString("base64");
    try {
      const t = convexTest(schema, modules);
      const owner = t.withIdentity({
        subject: "owner_multi",
        email: "multi@example.com",
      });
      await owner.mutation(api.onboarding.createBusinessOnboarding, {
        businessName: "Multi Tender Store",
        collectTax: false,
      });

      const productId = await owner.mutation(api.products.createProduct, {
        sku: "MULTI-1",
        productName: "Multi-Tender Flower 1g",
        sellingPriceCents: 4000,
        unitCostCents: 1500,
      });
      await owner.mutation(api.intake.recordIntake, {
        productId,
        totalWeightGrams: 50,
        totalCostCents: 75000,
      });

      // 1. Split tender sale: Card + Cash
      const splitSale = await owner.mutation(api.checkout.processCheckout, {
        orderNumber: "SPLIT-CARD-CASH-01",
        items: [{ productId, quantityGrams: 1 }],
        paymentMethod: "split",
        amountPaidCents: 4000,
        paymentTenders: [
          { method: "card", amountCents: 2500, reference: "card-txn-1" },
          { method: "cash", amountCents: 1500 },
        ],
      });

      // Confirmation required
      await expect(
        owner.mutation(api.refunds.refundOrder, {
          saleId: splitSale.saleId,
          reason: "Customer dissatisfaction",
          disposition: "restock",
        }),
      ).rejects.toThrow("Confirm the tender reversal");

      // External reference required because of card tender
      await expect(
        owner.mutation(api.refunds.refundOrder, {
          saleId: splitSale.saleId,
          reason: "Customer dissatisfaction",
          disposition: "restock",
          tenderRefundConfirmed: true,
        }),
      ).rejects.toThrow("Card reversals require an external reference");

      // Successful split refund
      const splitRefundResult = await owner.mutation(api.refunds.refundOrder, {
        saleId: splitSale.saleId,
        reason: "Customer dissatisfaction",
        disposition: "restock",
        tenderRefundConfirmed: true,
        externalReference: "card-refund-auth-999",
      });
      expect(splitRefundResult).toMatchObject({
        status: "REFUNDED",
        disposition: "restock",
        restoredAllocations: 1,
      });

      const refundedSaleRecord = await t.run(async (ctx) =>
        ctx.db.get(splitSale.saleId),
      );
      expect(refundedSaleRecord?.orderStatus).toBe("refunded");
      expect(refundedSaleRecord?.refundSettlementStatus).toBe("external_confirmed");
      expect(refundedSaleRecord?.refundReference).toBe("card-refund-auth-999");

      // 2. P2P sale: Cash App void
      const p2pSale = await owner.mutation(api.checkout.processCheckout, {
        orderNumber: "P2P-CASHAPP-01",
        items: [{ productId, quantityGrams: 1 }],
        paymentMethod: "p2p_cashapp",
        paymentReference: "CASHAPP-$CASHTAG",
        amountPaidCents: 4000,
      });

      await expect(
        owner.mutation(api.refunds.voidOrder, {
          saleId: p2pSale.saleId,
          reason: "CashApp payment declined by bank",
        }),
      ).rejects.toThrow("Confirm the tender reversal");

      const p2pVoidResult = await owner.mutation(api.refunds.voidOrder, {
        saleId: p2pSale.saleId,
        reason: "CashApp payment declined by bank",
        tenderReversalConfirmed: true,
        externalReference: "cashapp-reversal-ref-001",
      });
      expect(p2pVoidResult).toMatchObject({
        status: "VOIDED",
        restoredAllocations: 1,
      });

      const voidedSaleRecord = await t.run(async (ctx) =>
        ctx.db.get(p2pSale.saleId),
      );
      expect(voidedSaleRecord?.orderStatus).toBe("cancelled");
      expect(voidedSaleRecord?.voidSettlementStatus).toBe("external_confirmed");
      expect(voidedSaleRecord?.voidReference).toBe("cashapp-reversal-ref-001");

      // 3. Active delivery linked to a sale is automatically canceled on void
      const deliverySale = await owner.mutation(api.checkout.processCheckout, {
        orderNumber: "DELIVERY-VOID-01",
        items: [{ productId, quantityGrams: 1 }],
        paymentMethod: "cash",
        amountPaidCents: 5000,
        delivery: {
          address: "123 Main St, Suite 4",
          vendorFeeCents: 1000,
          customerFeeCents: 1000,
          chargeCustomer: true,
        },
      });

      const deliveryBefore = await t.run(async (ctx) =>
        ctx.db
          .query("deliveries")
          .withIndex("by_saleId", (q) => q.eq("saleId", deliverySale.saleId))
          .unique(),
      );
      expect(deliveryBefore?.status).toBe("ready_for_dispatch");

      await owner.mutation(api.refunds.voidOrder, {
        saleId: deliverySale.saleId,
        reason: "Customer cancelled before dispatch",
        tenderReversalConfirmed: true,
      });

      const deliveryAfter = await t.run(async (ctx) =>
        ctx.db
          .query("deliveries")
          .withIndex("by_saleId", (q) => q.eq("saleId", deliverySale.saleId))
          .unique(),
      );
      expect(deliveryAfter?.status).toBe("canceled");
      expect(deliveryAfter?.cancellationReason).toContain(
        "Customer cancelled before dispatch",
      );
    } finally {
      delete process.env.DRX_PII_KEY_CURRENT_B64;
    }
  });
});
