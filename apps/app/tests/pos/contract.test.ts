import { describe, expect, it } from "vitest";
import {
  posCheckoutSchema,
  posProductSchema,
  receiptOutputSchema,
  stockAdjustmentSchema,
} from "@/lib/pos/contract";

describe("POS contract", () => {
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

