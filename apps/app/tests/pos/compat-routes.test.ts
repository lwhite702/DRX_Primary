import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class PosCheckoutError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }

  return {
    resolveAuthContext: vi.fn(),
    createCart: vi.fn(),
    addItem: vi.fn(),
    setPayment: vi.fn(),
    setTaxAmount: vi.fn(),
    setFees: vi.fn(),
    setPaymentRef: vi.fn(),
    setAmountPaid: vi.fn(),
    setDelivery: vi.fn(),
    checkout: vi.fn(),
    performFullCheckout: vi.fn(),
    salesFindFirst: vi.fn(),
    PosCheckoutError,
  };
});

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/pos/core", () => ({
  PosCheckoutError: mocks.PosCheckoutError,
  createCart: mocks.createCart,
  addItem: mocks.addItem,
  setPayment: mocks.setPayment,
  setTaxAmount: mocks.setTaxAmount,
  setFees: mocks.setFees,
  setPaymentRef: mocks.setPaymentRef,
  setAmountPaid: mocks.setAmountPaid,
  setDelivery: mocks.setDelivery,
  checkout: mocks.checkout,
}));

vi.mock("@/app/api/pos/_lib/full-checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/api/pos/_lib/full-checkout")>()),
  performFullCheckout: mocks.performFullCheckout,
}));

vi.mock("@/lib/db", () => ({
  db: {
    sales: {
      findFirst: mocks.salesFindFirst,
    },
  },
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
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
    });
    mocks.createCart.mockImplementation((params) => ({
      ...params,
      items: [],
      payment: null,
      fees: [],
      taxAmount: 0,
    }));
    mocks.addItem.mockImplementation((cart, item) => ({
      ...cart,
      items: [...cart.items, item],
    }));
    mocks.setPayment.mockImplementation((cart, payment) => ({
      ...cart,
      payment,
    }));
    mocks.setTaxAmount.mockImplementation((cart, taxAmount) => ({
      ...cart,
      taxAmount,
    }));
    mocks.setFees.mockImplementation((cart, fees) => ({
      ...cart,
      fees,
    }));
    mocks.setPaymentRef.mockImplementation((cart, paymentRef) => ({
      ...cart,
      paymentRef,
    }));
    mocks.setAmountPaid.mockImplementation((cart, amountPaid) => ({
      ...cart,
      amountPaid,
    }));
    mocks.setDelivery.mockImplementation((cart, delivery) => ({
      ...cart,
      ...delivery,
    }));
    mocks.checkout.mockResolvedValue({
      saleId: "sale_123",
      orderNumber: "POS-123",
      total: 15,
      changeAmount: 0,
    });
    mocks.performFullCheckout.mockResolvedValue({ saleId: "sale_123", orderNumber: "POS-123", total: 15, changeAmount: 0 });
    mocks.salesFindFirst.mockResolvedValue({
      id: "sale_123",
      orderNumber: "POS-123",
      items: [{ inventoryId: "inv_1" }],
    });
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
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("preserves the remaining legacy /api/sales writer contract until its conversion", async () => {
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
      sale: {
        id: "sale_123",
        orderNumber: "POS-123",
        items: [{ inventoryId: "inv_1" }],
      },
    });
    expect(mocks.createCart).toHaveBeenCalledWith({
      businessId: "business_123",
      userId: "user_123",
      mode: "full",
      source: "sales-api",
      customerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(mocks.salesFindFirst).toHaveBeenCalledWith({
      where: {
        id: "sale_123",
        businessId: "business_123",
      },
      include: {
        items: true,
      },
    });
  });
});
