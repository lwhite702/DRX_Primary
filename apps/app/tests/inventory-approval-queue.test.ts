import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ context: vi.fn(), permission: vi.fn(), findMany: vi.fn() }));
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.context }));
vi.mock("@/lib/auth/server-guards", () => ({ hasBusinessPermission: mocks.permission }));
vi.mock("@/lib/db", () => ({ db: { inventoryIntake: { findMany: mocks.findMany } } }));
vi.mock("@/lib/inventory/intake-service", () => ({ createInventoryIntake: vi.fn(), InventoryIntakeError: class extends Error {} }));

import { GET } from "@/app/api/inventory/intake/route";

const intake = (id: string, status: string, timestamp: number, businessId = "business-a") => ({
  id, businessId, status, createdAt: new Date(timestamp), inventoryId: "inventory-a",
  inventory: { productName: "Synthetic product", sku: "SYNTHETIC" },
  totalCost: 10, totalWeightGrams: 10, calculatedCostPerGram: 1, deliveryCost: 0, supplier: null,
});

function useRows(rows: ReturnType<typeof intake>[]) {
  mocks.findMany.mockImplementation(async ({ where, take }: {
    where: { businessId: string; status?: string | { not: string } }; take?: number;
  }) => rows.filter(row => row.businessId === where.businessId && (
    where.status === undefined || (typeof where.status === "string"
      ? row.status === where.status : row.status !== where.status.not)
  )).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, take));
}

async function readQueue() {
  const response = await GET(new NextRequest("http://localhost/api/inventory/intake"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  return (await response.json()).items as { id: string; status: string }[];
}

describe("business intake approval queue", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.context.mockResolvedValue({ userId: "actor", businessId: "business-a" });
    mocks.permission.mockResolvedValue(true);
  });

  it("retains old pending approvals while bounding completed history", async () => {
    useRows([
      intake("old-pending", "pending", 1),
      ...Array.from({ length: 101 }, (_, i) => intake(`history-${i}`, i % 2 ? "approved" : "rejected", i + 2)),
      intake("other-business", "pending", 1000, "business-b"),
    ]);
    const items = await readQueue();
    expect(items.filter(row => row.status === "pending").map(row => row.id)).toEqual(["old-pending"]);
    expect(items.filter(row => row.status !== "pending")).toHaveLength(100);
    expect(items.some(row => row.id === "history-0" || row.id === "other-business")).toBe(false);
  });

  it("does not cap outstanding approvals at the history limit", async () => {
    useRows(Array.from({ length: 101 }, (_, i) => intake(`pending-${i}`, "pending", i)));
    expect(await readQueue()).toHaveLength(101);
  });

  it("denies business staff without inventory permission before querying", async () => {
    mocks.permission.mockResolvedValue(false);
    expect((await GET(new NextRequest("http://localhost/api/inventory/intake"))).status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("fails closed if either queue or history cannot be read", async () => {
    mocks.findMany.mockRejectedValue(new Error("Synthetic database failure"));
    expect((await GET(new NextRequest("http://localhost/api/inventory/intake"))).status).toBe(503);
  });
});
