import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  validateInventoryAvailability: vi.fn(),
  validateCreditBalance: vi.fn(),
  db: { marker: "db" },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/pos/core", () => ({
  validateInventoryAvailability: mocks.validateInventoryAvailability,
  validateCreditBalance: mocks.validateCreditBalance,
}));

import { POST } from "@/app/api/pos/preflight/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/pos/preflight", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
    });
    mocks.validateInventoryAvailability.mockResolvedValue({
      valid: true,
      errors: [],
      stockById: new Map(),
    });
    mocks.validateCreditBalance.mockResolvedValue({
      valid: true,
      currentBalance: 10,
      maxLimit: 100,
      remaining: 90,
    });
  });

  it("combines stock and credit validation into one canonical payload", async () => {
    const res = await POST(
      makeRequest({
        customerId: "cust_1",
        amount: 25,
        items: [
          {
            inventory_id: "inv_1",
            product_name: "Flower",
            quantity: 2,
            unit_price: 12.5,
          },
        ],
      }),
    );

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      valid: true,
      stock: {
        valid: true,
        errors: [],
      },
      credit: {
        valid: true,
        currentBalance: 10,
        maxLimit: 100,
        remaining: 90,
      },
      pricing: {
        valid: true,
        errors: [],
      },
      errors: [],
    });

    expect(mocks.validateInventoryAvailability).toHaveBeenCalledWith(
      mocks.db,
      "business_123",
      expect.arrayContaining([
        expect.objectContaining({
          inventoryId: "inv_1",
          name: "Flower",
          qty: 2,
          unitPrice: 12.5,
        }),
      ]),
    );
    expect(mocks.validateCreditBalance).toHaveBeenCalledWith(
      mocks.db,
      "business_123",
      "cust_1",
      25,
    );
  });

  it("returns a combined failure response", async () => {
    mocks.validateInventoryAvailability.mockResolvedValue({
      valid: false,
      errors: [{ inventoryId: "inv_1", message: "Insufficient stock" }],
      stockById: new Map(),
    });
    mocks.validateCreditBalance.mockResolvedValue({
      valid: false,
      currentBalance: 99,
      maxLimit: 100,
      remaining: 1,
      warning: "Credit limit exceeded",
    });

    const res = await POST(
      makeRequest({
        customer_id: "cust_1",
        amount: 25,
        items: [{ inventory_id: "inv_1", quantity: 2, unit_price: 12.5 }],
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.errors).toEqual(
      expect.arrayContaining(["Insufficient stock", "Credit limit exceeded"]),
    );
  });
});
