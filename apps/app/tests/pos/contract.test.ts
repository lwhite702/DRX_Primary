import { describe, expect, it } from "vitest";
import {
  posCheckoutSchema,
  posProductSchema,
  quickCheckoutPayloadSchema,
  receiptOutputSchema,
  stockAdjustmentSchema,
} from "@/lib/pos/contract";

describe("POS contract", () => {
  it("rejects requested fixed amounts on manual checkout lines", () => {
    const result = quickCheckoutPayloadSchema.safeParse({
      mode: "quick",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      payment: { method: "cash", receipt: "none", creditConfirmed: false },
      items: [{
        id: "manual-1",
        inventoryId: null,
        name: "Manual item",
        unitPrice: 25,
        qty: 1,
        source: "manual",
        requestedAmountCents: 2_500,
      }],
    });
    expect(result.success).toBe(false);
  });

  it("validates product shape with optional sku/barcode", () => {
    const parsed = posProductSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Test Product",
      sku: "SKU-1",
      barcode: null,
      price: 9.99,
      quantityOnHand: 5,
      lowStockThreshold: 3,
    });

    expect(parsed.sku).toBe("SKU-1");
    expect(parsed.barcode).toBeNull();
  });

  it("validates quick checkout payloads", () => {
    const result = posCheckoutSchema.safeParse({
      mode: "quick",
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
      customerId: null,
      payment: { method: "cash", receipt: "none", creditConfirmed: false },
      items: [
        {
          id: "inv:1",
          inventoryId: "33333333-3333-4333-8333-333333333333",
          name: "Item",
          unitPrice: 5,
          qty: 1,
          source: "inventory",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.source).toBe("quick-pos");
  });

  it("validates full checkout payloads with weighted and delivery metadata", () => {
    const result = posCheckoutSchema.safeParse({
      mode: "full",
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
      customerId: "66666666-6666-4666-8666-666666666666",
      source: "legacy-sales",
      payment: { method: "card", receipt: "print", creditConfirmed: false },
      items: [
        {
          id: "weighted-1",
          inventoryId: "77777777-7777-4777-8777-777777777777",
          name: "Weighted Item",
          unitPrice: 28,
          qty: 1,
          source: "inventory",
          weightGrams: 3.5,
          pricePerGram: 8,
          bulkTierApplied: "3.5g",
          originalPrice: 30,
          overrideReason: "Manager approved",
        },
      ],
      taxAmount: 1.2,
      fees: [{ type: "service", amount: 2 }],
      paymentRef: "ZELLE-123",
      amountPaid: 35,
      deliveryManagementId: "88888888-8888-4888-8888-888888888888",
      deliveryAddress: "123 Main St",
      deliveryPrice: 4,
    });

    expect(result.success).toBe(true);
  });

  it("validates stock adjustments and receipt output", () => {
    expect(
      stockAdjustmentSchema.parse({
        inventoryId: "44444444-4444-4444-8444-444444444444",
        quantityDelta: -2,
        reason: "damaged",
        lowStockThreshold: 10,
      }),
    ).toBeTruthy();

    expect(
      receiptOutputSchema.parse({
        saleId: "sale_123",
        total: 20,
        receipt: "print",
        channels: [{ type: "receipt", value: "print" }],
      }),
    ).toBeTruthy();
  });
});
