import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    businessClient: vi.fn(),
    resolveAuthContext: vi.fn(),
    checkoutCanonicalCommerce: vi.fn(),
    performFullCheckout: vi.fn(),
  };
});

vi.mock("@/lib/business/convex-server", () => ({
  businessClient: mocks.businessClient,
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/app/api/pos/_lib/convex-commerce", () => ({
  checkoutCanonicalCommerce: mocks.checkoutCanonicalCommerce,
}));

vi.mock("@/app/api/pos/_lib/full-checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/api/pos/_lib/full-checkout")>()),
  performFullCheckout: mocks.performFullCheckout,
}));

import { POST as postCheckoutEnhanced } from "@/app/api/pos/checkout-enhanced/route";
import { POST as postSales } from "@/app/api/sales/route";

function makeRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POS compatibility routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({ businessId: "business_123" });
    mocks.resolveAuthContext.mockResolvedValue({ userId: "user_123", businessId: "business_123" });
    mocks.checkoutCanonicalCommerce.mockResolvedValue({
      saleId: "sale_123", orderNumber: "POS-123", total: 15, changeAmount: 0,
    });
    mocks.performFullCheckout.mockResolvedValue({ saleId: "sale_123", orderNumber: "POS-123", total: 15, changeAmount: 0 });
  });

  it("maps checkout-enhanced payloads to the canonical service", async () => {
    const res = await postCheckoutEnhanced(
      makeRequest("http://localhost/api/pos/checkout-enhanced", {
        idempotencyKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        customerId: "11111111-1111-4111-8111-111111111111",
        paymentMethod: "card",
        lineItems: [
          {
            inventory_id: "22222222-2222-4222-8222-222222222222",
            product_name: "Weighted Item",
            quantity: 1,
            unit_price: 28,
            weight_grams: 3.5,
            price_per_gram: 8,
            bulk_tier_applied: "3.5g",
          },
        ],
        taxAmount: 1.2,
        paymentRef: "AUTH-123",
        amountPaid: 30,
      }) as any,
    );

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({
      success: true,
      saleId: "sale_123",
      orderNumber: "POS-123",
      totals: {
        total: 15,
        changeAmount: 0,
      },
      errors: [],
    });
    expect(mocks.performFullCheckout).toHaveBeenCalledWith(expect.objectContaining({
      mode: "full", source: "checkout-enhanced",
      customerId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      items: [expect.objectContaining({ weightGrams: 3.5, qty: 1, unitPrice: 28 })],
    }), "business_123");
  });

  it("routes the legacy /api/sales writer through canonical commerce", async () => {
    const res = await postSales(
      makeRequest("http://localhost/api/sales", {
        customer_id: "11111111-1111-4111-8111-111111111111",
        payment_method: "cash",
        tax_amount: 1,
        delivery_price: 3,
        items: [
          {
            inventory_id: "22222222-2222-4222-8222-222222222222",
            product_name: "Item",
            quantity: 2,
            unit_price: 5,
          },
        ],
      }) as any,
    );

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data).toEqual({
      success: true,
      saleId: "sale_123",
      orderNumber: "POS-123",
      totals: {
        total: 15,
        changeAmount: 0,
      },
      errors: [],
    });
    expect(mocks.checkoutCanonicalCommerce).toHaveBeenCalledWith(expect.objectContaining({
      businessId: "business_123",
      customerId: "11111111-1111-4111-8111-111111111111",
      paymentMethod: "cash",
      items: [expect.objectContaining({ inventoryId: "22222222-2222-4222-8222-222222222222", qty: 2, unitPrice: 5 })],
    }));
  });
});
