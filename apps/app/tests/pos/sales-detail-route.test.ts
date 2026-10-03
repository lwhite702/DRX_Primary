import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  businessClient: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock("@/lib/business/convex-server", () => ({
  businessClient: mocks.businessClient,
}));

import { GET, PATCH } from "@/app/api/sales/[id]/route";

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/sales/sale_123", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET/PATCH /api/sales/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({
      client: {
        query: mocks.query,
        mutation: mocks.mutation,
      },
      businessId: "business_123",
      expectedUserId: "user_123",
    });
    mocks.query.mockResolvedValue({
      sale: {
        _id: "sale_123",
        orderNumber: "POS-123",
        orderStatus: "completed",
        customerId: "cust_1",
        paymentMethod: "card",
        paymentReference: "AUTH-123",
        subtotalCents: 2800,
        taxAmountCents: 0,
        totalAmountCents: 2800,
        amountPaidCents: 3500,
        changeAmountCents: 480,
        createdAt: 1773136800000,
        updatedAt: 1773136800000,
      },
      customer: {
        id: "cust_1",
        firstName: "Jane",
      },
      items: [
        {
          _id: "line_123",
          inventoryId: "inv_1",
          quantityGrams: 3.5,
          unitPriceCents: 2800,
          lineTotalCents: 2800,
          unitCost: 5,
          weightSoldGrams: 3.5,
          pricePerGram: 8,
          bulkTierApplied: "3.5g",
          loyaltyDiscountApplied: 0.1,
          originalPrice: 30,
          priceOverrideReason: "Manager approved",
          productName: "Weighted Item",
        },
      ],
      allocations: [
        {
          _id: "alloc_1",
          quantityGrams: 3.5,
          unitCostPerGram: 4.25,
          extendedCostCents: 1488,
          batchId: "batch_1",
        },
      ],
      costOfGoodsSoldCents: 1488,
      grossProfitCents: 1312,
      grossMarginPercent: 46.86,
    });
    mocks.mutation.mockResolvedValue({
      success: true,
      sale: {
        id: "sale_123",
        paymentMethod: "cash",
        paymentReference: "CASH-REF-1",
      },
    });
  });

  it("returns 401 when auth context is missing", async () => {
    mocks.businessClient.mockRejectedValue(new Error("UNAUTHORIZED:"));

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
    expect(mocks.query).toHaveBeenCalledWith(
      expect.anything(),
      { saleId: "sale_123" },
    );
    expect(data.id).toBe("sale_123");
    expect(data.orderNumber).toBe("POS-123");
    expect(data.paymentRef).toBe("AUTH-123");
    expect(data.amountPaid).toBe(35);
    expect(data.costSummary).toEqual({
      costOfGoodsSold: 14.88,
      grossProfit: 13.12,
      grossMarginPercent: 46.86,
    });
    expect(data.items[0]).toEqual(
      expect.objectContaining({
        id: "line_123",
        unitPrice: 28,
        quantity: 3.5,
        priceOverrideReason: "Manager approved",
      }),
    );
    expect(data.allocations[0]).toEqual(
      expect.objectContaining({
        id: "alloc_1",
        quantity: 3.5,
        extendedCost: 14.88,
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
    expect(mocks.mutation).toHaveBeenCalledWith(
      expect.anything(),
      {
        saleId: "sale_123",
        paymentMethod: "cash",
        paymentReference: "CASH-REF-1",
      },
    );
    expect(data).toEqual({
      success: true,
      sale: {
        id: "sale_123",
        paymentMethod: "cash",
        paymentReference: "CASH-REF-1",
      },
    });
  });

  it("returns 404 when sale not found on GET", async () => {
    mocks.query.mockRejectedValue(new Error("NOT_FOUND: Sale not found"));
    const res = await GET(new NextRequest("http://localhost/api/sales/unknown"), {
      params: { id: "unknown" },
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Sale not found" });
  });

  it("returns 401 when auth fails on PATCH", async () => {
    mocks.businessClient.mockRejectedValue(new Error("UNAUTHORIZED:"));
    const res = await PATCH(makePatchRequest({ paymentMethod: "cash" }), {
      params: { id: "sale_123" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
