import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  getAuthoritativeQuote: vi.fn(),
  quoteCanonicalCommerce: vi.fn(),
  shouldUseCanonicalCommerce: vi.fn(),
  hasConfiguredCanonicalCommerce: vi.fn(),
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/app/api/pos/_lib/convex-commerce", () => ({
  quoteCanonicalCommerce: mocks.quoteCanonicalCommerce,
  shouldUseCanonicalCommerce: mocks.shouldUseCanonicalCommerce,
}));

vi.mock("@/app/api/pos/_lib/commerce-routing", () => ({
  hasConfiguredCanonicalCommerce: mocks.hasConfiguredCanonicalCommerce,
}));

vi.mock("@/lib/pos/core", () => {
  class PosCheckoutError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }

  return {
    PosCheckoutError,
    createCart: (params: Record<string, unknown>) => ({
      ...params,
      items: [],
      fees: [],
      taxAmount: 0,
    }),
    addItem: (cart: { items: unknown[] }, item: unknown) => ({
      ...cart,
      items: [...cart.items, item],
    }),
    getAuthoritativeQuote: mocks.getAuthoritativeQuote,
  };
});

import { POST } from "@/app/api/pos/quote/route";

describe("quick POS quote route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "11111111-1111-4111-8111-111111111111",
    });
    mocks.getAuthoritativeQuote.mockResolvedValue({
      subtotal: 40,
      subtotalAfterDiscount: 36,
      loyaltyDiscountAmount: 4,
      loyaltyDiscountRate: 0.1,
      taxAmount: 2.97,
      feesTotal: 0,
      total: 38.97,
    });
    mocks.shouldUseCanonicalCommerce.mockReturnValue(false);
    mocks.hasConfiguredCanonicalCommerce.mockResolvedValue(false);
    mocks.quoteCanonicalCommerce.mockResolvedValue({
      subtotal: 10,
      subtotalAfterDiscount: 9,
      loyaltyDiscountAmount: 1,
      loyaltyDiscountRate: 0,
      taxAmount: 0.9,
      merchandiseTaxAmount: 0.9,
      deliveryTaxAmount: 0,
      deliveryRevenue: 0,
      vendorDeliveryExpense: 0,
      feesTotal: 0,
      total: 9.9,
    });
  });

  it("uses the canonical quote for delivery and commerce-configured carts", async () => {
    mocks.shouldUseCanonicalCommerce.mockReturnValue(true);
    const request = new NextRequest("http://localhost/api/pos/quote", {
      method: "POST",
      body: JSON.stringify({
        mode: "quick",
        items: [
          {
            id: "inv:1",
            inventoryId: "22222222-2222-4222-8222-222222222222",
            name: "Fractional item",
            sku: "SYNC-1",
            unitPrice: 9,
            qty: 1,
            weightGrams: 1.25,
            source: "inventory",
          },
        ],
        delivery: {
          enabled: true,
          address: "123 Synthetic Test Street",
          vendorFeeCents: 500,
          feeAllocation: "charge_customer",
          feeTaxable: false,
        },
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.quoteCanonicalCommerce).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "11111111-1111-4111-8111-111111111111",
        delivery: expect.objectContaining({ vendorFeeCents: 500 }),
      }),
    );
    expect(mocks.getAuthoritativeQuote).not.toHaveBeenCalled();
  });

  it("returns the server-authoritative total before payment", async () => {
    const request = new NextRequest("http://localhost/api/pos/quote", {
      method: "POST",
      body: JSON.stringify({
        mode: "quick",
        customerId: "44444444-4444-4444-8444-444444444444",
        items: [
          {
            id: "inv:1",
            inventoryId: "22222222-2222-4222-8222-222222222222",
            name: "Inventory item",
            unitPrice: 1,
            qty: 2,
            source: "inventory",
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      quote: {
        loyaltyDiscountAmount: 4,
        taxAmount: 2.97,
        total: 38.97,
      },
    });
    expect(mocks.getAuthoritativeQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "11111111-1111-4111-8111-111111111111",
        mode: "quick",
        customerId: "44444444-4444-4444-8444-444444444444",
        items: [
          expect.objectContaining({
            inventoryId: "22222222-2222-4222-8222-222222222222",
          }),
        ],
      }),
    );
  });

  it("routes a whole-unit bulk-priced cart through canonical pricing", async () => {
    mocks.hasConfiguredCanonicalCommerce.mockResolvedValue(true);
    const request = new NextRequest("http://localhost/api/pos/quote", {
      method: "POST",
      body: JSON.stringify({
        mode: "quick",
        items: [
          {
            id: "inv:bulk",
            inventoryId: "22222222-2222-4222-8222-222222222222",
            name: "Whole case",
            unitPrice: 10,
            qty: 12,
            source: "inventory",
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.quoteCanonicalCommerce).toHaveBeenCalled();
    expect(mocks.getAuthoritativeQuote).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated quote", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: null,
      businessId: null,
    });
    const response = await POST(
      new NextRequest("http://localhost/api/pos/quote", {
        method: "POST",
        body: JSON.stringify({ mode: "quick", items: [] }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.getAuthoritativeQuote).not.toHaveBeenCalled();
  });
});
