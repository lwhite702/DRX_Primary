import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  validateInventoryAvailability: vi.fn(),
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
}));

import { POST } from "@/app/api/pos/validate-stock/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/pos/validate-stock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/validate-stock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
    });
    mocks.validateInventoryAvailability.mockResolvedValue({
      valid: true,
      errors: [],
    });
  });

  it("returns 401 when auth context is missing", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null });

    const res = await POST(makeRequest({ items: [] }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(mocks.validateInventoryAvailability).not.toHaveBeenCalled();
  });

  it("normalizes legacy and weighted item fields before validation", async () => {
    const res = await POST(
      makeRequest({
        items: [
          {
            inventory_id: "11111111-1111-4111-8111-111111111111",
            product_name: "Flower",
            unit_price: "12.5",
            quantity: "2",
            sku: "FLOW-1",
            weight_grams: "3.5",
          },
        ],
      }),
    );

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ valid: true, errors: [] });
    expect(mocks.validateInventoryAvailability).toHaveBeenCalledWith(
      mocks.db,
      "business_123",
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          inventoryId: "11111111-1111-4111-8111-111111111111",
          name: "Flower",
          sku: "FLOW-1",
          barcode: null,
          unitPrice: 12.5,
          qty: 2,
          source: "inventory",
          weightGrams: 3.5,
        },
      ],
    );
  });

  it("returns canonical validation errors in legacy route shape", async () => {
    mocks.validateInventoryAvailability.mockResolvedValue({
      valid: false,
      errors: [
        {
          inventoryId: "22222222-2222-4222-8222-222222222222",
          message: "Insufficient stock for Flower",
        },
      ],
    });

    const res = await POST(
      makeRequest({
        items: [{ inventoryId: "22222222-2222-4222-8222-222222222222" }],
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      valid: false,
      errors: [
        {
          inventory_id: "22222222-2222-4222-8222-222222222222",
          message: "Insufficient stock for Flower",
        },
      ],
    });
  });
});
