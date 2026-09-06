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
    checkoutCanonicalCommerce: vi.fn(),
    shouldUseCanonicalCommerce: vi.fn(),
    hasConfiguredCanonicalCommerce: vi.fn(),
    PosCheckoutError,
  };
});

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/app/api/pos/_lib/convex-commerce", () => ({
  checkoutCanonicalCommerce: mocks.checkoutCanonicalCommerce,
  shouldUseCanonicalCommerce: mocks.shouldUseCanonicalCommerce,
}));

vi.mock("@/app/api/pos/_lib/commerce-routing", () => ({
  hasConfiguredCanonicalCommerce: mocks.hasConfiguredCanonicalCommerce,
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

import { POST } from "@/app/api/pos/checkout/route";

const QUICK_CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const INVENTORY_ID = "22222222-2222-4222-8222-222222222222";

function makeQuickPayload(overrides?: Record<string, unknown>) {
  return {
    mode: "quick",
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    customerId: QUICK_CUSTOMER_ID,
    payment: {
      method: "cash",
      receipt: "sms",
      creditConfirmed: false,
    },
    items: [
      {
        id: "line-1",
        inventoryId: INVENTORY_ID,
        name: "Item 1",
        unitPrice: 10,
        qty: 1,
        source: "inventory",
      },
    ],
    ...overrides,
  };
}

function makeFullPayload(overrides?: Record<string, unknown>) {
  return {
    mode: "full",
    idempotencyKey: "44444444-4444-4444-8444-444444444444",
    customerId: null,
    payment: {
      method: "mixed",
      receipt: "print",
      creditConfirmed: false,
    },
    items: [
      {
        id: "line-1",
        inventoryId: INVENTORY_ID,
        name: "Inventory Item",
        unitPrice: 20,
        qty: 2,
        source: "inventory",
      },
    ],
    taxAmount: 1.5,
    fees: [{ type: "service", amount: 2.5 }],
    ...overrides,
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/pos/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/checkout", () => {
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
      orderNumber: "POS-33333333-3333-4333-8333-333333333333",
      total: 15,
      changeAmount: 0,
    });
    mocks.shouldUseCanonicalCommerce.mockReturnValue(false);
    mocks.hasConfiguredCanonicalCommerce.mockResolvedValue(false);
    mocks.checkoutCanonicalCommerce.mockResolvedValue({
      saleId: "convex_sale_123",
      orderNumber: "WEB-33333333-3333-4333-8333-333333333333",
      total: 20,
      changeAmount: 0,
    });
  });

  it("routes delivery checkout through the atomic canonical sale and delivery mutation", async () => {
    mocks.shouldUseCanonicalCommerce.mockReturnValue(true);
    const payload = makeQuickPayload({
      delivery: {
        enabled: true,
        address: "123 Synthetic Test Street",
        vendorFeeCents: 500,
        feeAllocation: "absorb",
        feeTaxable: false,
      },
    });

    const res = await POST(makeRequest(payload) as any);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({
      success: true,
      saleId: "convex_sale_123",
      total: 20,
    });
    expect(mocks.checkoutCanonicalCommerce).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: "business_123",
        idempotencyKey: payload.idempotencyKey,
        delivery: expect.objectContaining({
          vendorFeeCents: 500,
          feeAllocation: "absorb",
        }),
      }),
    );
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("returns 401 when auth context is missing", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null });
    const res = await POST(makeRequest(makeQuickPayload()) as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("routes a whole-unit bulk-priced checkout through canonical commerce", async () => {
    mocks.hasConfiguredCanonicalCommerce.mockResolvedValue(true);
    const payload = makeQuickPayload({
      customerId: null,
      items: [
        {
          id: "line-bulk",
          inventoryId: INVENTORY_ID,
          name: "Whole case",
          unitPrice: 10,
          qty: 12,
          source: "inventory",
        },
      ],
    });

    const res = await POST(makeRequest(payload) as any);

    expect(res.status).toBe(201);
    expect(mocks.checkoutCanonicalCommerce).toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payload", async () => {
    const res = await POST(makeRequest({ mode: "quick" }) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: "Invalid checkout payload",
    });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("processes ordinary quick checkout in Convex even without legacy routing flags", async () => {
    const payload = makeQuickPayload({ customerId: null });
    const res = await POST(makeRequest(payload) as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data).toMatchObject({ success: true, saleId: "convex_sale_123", total: 20, totals: { total: 20, changeAmount: 0 } });
    expect(mocks.checkoutCanonicalCommerce).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: payload.idempotencyKey }));
    expect(mocks.createCart).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("processes full mode checkout with tax and fees", async () => {
    const payload = makeFullPayload();
    const res = await POST(makeRequest(payload) as any);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mocks.setTaxAmount).toHaveBeenCalledWith(expect.any(Object), 1.5);
    expect(mocks.setFees).toHaveBeenCalledWith(expect.any(Object), [
      { type: "service", amount: 2.5 },
    ]);
  });

  it("maps full mode delivery and payment metadata into the canonical cart", async () => {
    const payload = makeFullPayload({
      paymentRef: "ZELLE-123",
      amountPaid: 25,
      deliveryManagementId: "55555555-5555-4555-8555-555555555555",
      deliveryAddress: "123 Main St",
      deliveryPrice: 4.5,
    });

    const res = await POST(makeRequest(payload) as any);
    expect(res.status).toBe(201);
    expect(mocks.setPaymentRef).toHaveBeenCalledWith(expect.any(Object), "ZELLE-123");
    expect(mocks.setAmountPaid).toHaveBeenCalledWith(expect.any(Object), 25);
    expect(mocks.setDelivery).toHaveBeenCalledWith(expect.any(Object), {
      deliveryManagementId: "55555555-5555-4555-8555-555555555555",
      deliveryAddress: "123 Main St",
      deliveryPrice: 4.5,
    });
  });

  it("returns 409 for duplicate idempotency keys", async () => {
    mocks.checkout.mockRejectedValue(new mocks.PosCheckoutError("Duplicate idempotency key", 409));

    const res = await POST(makeRequest(makeFullPayload()) as any);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data).toEqual({
      success: false,
      saleId: null,
      orderNumber: null,
      totals: null,
      errors: ["Duplicate idempotency key"],
      error: "Duplicate idempotency key",
    });
  });
});
