import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  salesFindFirst: vi.fn(),
  salesUpdate: vi.fn(),
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/db", () => ({
  db: {
    sales: {
      findFirst: mocks.salesFindFirst,
      update: mocks.salesUpdate,
    },
    $transaction: vi.fn(),
  },
}));

import { GET, PATCH } from "@/app/api/sales/[id]/route";

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/sales/sale_123", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET/PATCH /api/sales/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
    });
    mocks.salesFindFirst.mockResolvedValue({
      id: "sale_123",
      businessId: "business_123",
      orderNumber: "POS-123",
      paymentMethod: "card",
      paymentRef: "AUTH-123",
      amountPaid: 35,
      changeAmount: 4.8,
      deliveryAddress: "123 Main St",
      deliveryPrice: 5,
      items: [
        {
          inventoryId: "inv_1",
          quantity: 1,
          unitPrice: 28,
          unitCost: 5,
          weightSoldGrams: 3.5,
          pricePerGram: 8,
          bulkTierApplied: "3.5g",
          loyaltyDiscountApplied: 0.1,
          originalPrice: 30,
          priceOverrideReason: "Manager approved",
          inventory: {
            id: "inv_1",
            productName: "Weighted Item",
          },
        },
      ],
      customer: {
        id: "cust_1",
        firstName: "Jane",
      },
    });
    mocks.salesUpdate.mockResolvedValue({
      id: "sale_123",
      paymentMethod: "cash",
      paymentRef: "CASH-REF-1",
    });
  });

  it("returns 401 when auth context is missing", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null });

    const res = await GET(new NextRequest("http://localhost/api/sales/sale_123"), {
      params: { id: "sale_123" },
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns sale detail with preserved payment and line metadata", async () => {
    const res = await GET(new NextRequest("http://localhost/api/sales/sale_123"), {
      params: { id: "sale_123" },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.salesFindFirst).toHaveBeenCalledWith({
      where: { id: "sale_123", businessId: "business_123" },
      include: {
        items: {
          include: {
            inventory: true,
          },
        },
        customer: true,
      },
    });
    expect(data.paymentRef).toBe("AUTH-123");
    expect(data.amountPaid).toBe(35);
    expect(data.deliveryAddress).toBe("123 Main St");
    expect(data.items[0]).toEqual(
      expect.objectContaining({
        unitCost: 5,
        weightSoldGrams: 3.5,
        pricePerGram: 8,
        bulkTierApplied: "3.5g",
        loyaltyDiscountApplied: 0.1,
        originalPrice: 30,
        priceOverrideReason: "Manager approved",
      }),
    );
  });

  it("updates payment method and paymentRef together", async () => {
    const res = await PATCH(makePatchRequest({
      paymentMethod: "cash",
      paymentRef: "CASH-REF-1",
    }), {
      params: { id: "sale_123" },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.salesUpdate).toHaveBeenCalledWith({
      where: { id: "sale_123" },
      data: {
        paymentMethod: "cash",
        paymentRef: "CASH-REF-1",
      },
    });
    expect(data).toEqual({
      id: "sale_123",
      paymentMethod: "cash",
      paymentRef: "CASH-REF-1",
    });
  });
});
