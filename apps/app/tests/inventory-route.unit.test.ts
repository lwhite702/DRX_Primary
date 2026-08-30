import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockDb: any = {
  inventory: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  inventoryLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: any) => any) => callback(mockDb)),
};

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  hasBusinessPermission: vi.fn(),
  db: mockDb,
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET, PUT } from "@/app/api/inventory/[id]/route";

function request(path: string, method = "GET", body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const testInventoryId = "11111111-1111-4111-8111-111111111111";

describe("inventory [id] route with Next.js 16 async params", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user-1",
      businessId: "business-1",
    });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.db.inventory.findFirst.mockResolvedValue({
      id: testInventoryId,
      businessId: "business-1",
      productName: "OG Kush",
      sku: "OG-01",
      quantityOnHand: 10,
    });
    mocks.db.inventory.update.mockResolvedValue({
      id: testInventoryId,
      businessId: "business-1",
      productName: "OG Kush Updated",
      sku: "OG-01",
      quantityOnHand: 20,
    });
  });

  it("handles async params Promise on GET /api/inventory/[id]", async () => {
    const context = { params: Promise.resolve({ id: testInventoryId }) };
    const response = await GET(
      request(`/api/inventory/${testInventoryId}`),
      context as any,
    );

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.id).toBe(testInventoryId);
    expect(mocks.db.inventory.findFirst).toHaveBeenCalledWith({
      where: { id: testInventoryId, businessId: "business-1" },
    });
  });

  it("handles async params Promise on PUT /api/inventory/[id]", async () => {
    const context = { params: Promise.resolve({ id: testInventoryId }) };
    const response = await PUT(
      request(`/api/inventory/${testInventoryId}`, "PUT", {
        product_name: "OG Kush Updated",
        quantity_on_hand: 20,
      }),
      context as any,
    );

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.productName).toBe("OG Kush Updated");
  });
});
