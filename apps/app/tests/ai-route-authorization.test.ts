import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  delete process.env.OPENAI_API_KEY;

  return {
    resolveAuthContext: vi.fn(),
    hasBusinessPermission: vi.fn(),
    emit: vi.fn(),
    db: {
      $transaction: vi.fn(),
      aiInsight: {
        create: vi.fn(),
      },
      aiInsightFailure: {
        create: vi.fn(),
      },
      businessProfile: {
        findUnique: vi.fn(),
      },
      inventory: {
        findMany: vi.fn(),
      },
      inventoryAlert: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      salesLineItem: {
        findMany: vi.fn(),
      },
      systemAuditLog: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

vi.mock("@/lib/queue", () => ({ emit: mocks.emit }));

import { GET as GET_ALERTS, POST as POST_ALERT } from "@/app/api/ai/alerts/route";
import { POST as POST_INVENTORY_HEALTH } from "@/app/api/ai/inventory-health/route";
import { POST as POST_PRICING_INVENTORY } from "@/app/api/ai/pricing-inventory/route";

function request(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {},
) {
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

describe("AI route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "actor-1",
      businessId: "business-1",
    });
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: true });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.emit.mockResolvedValue({ ids: ["job-1"] });
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.db),
    );
    mocks.db.inventory.findMany.mockResolvedValue([]);
    mocks.db.salesLineItem.findMany.mockResolvedValue([]);
    mocks.db.aiInsightFailure.create.mockResolvedValue({});
    mocks.db.inventoryAlert.findFirst.mockResolvedValue(null);
    mocks.db.inventoryAlert.findMany.mockResolvedValue([]);
    mocks.db.inventoryAlert.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.systemAuditLog.create.mockResolvedValue({});
  });

  it("rejects unauthenticated inventory health requests before data access", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: null,
      businessId: null,
    });

    const response = await POST_INVENTORY_HEALTH(
      request("/api/ai/inventory-health", {
        method: "POST",
        body: { business_id: "business-1" },
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.db.businessProfile.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.inventory.findMany).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("rejects a body business id that differs from the resolved tenant", async () => {
    const response = await POST_INVENTORY_HEALTH(
      request("/api/ai/inventory-health", {
        method: "POST",
        body: { business_id: "business-2" },
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.inventory.findMany).not.toHaveBeenCalled();
    expect(mocks.db.salesLineItem.findMany).not.toHaveBeenCalled();
  });

  it("queries only the authorized business for inventory health", async () => {
    const response = await POST_INVENTORY_HEALTH(
      request("/api/ai/inventory-health", {
        method: "POST",
        body: { business_id: "business-1" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith(
      "actor-1",
      "business-1",
      "inventory.manage",
    );
    expect(mocks.db.inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: "business-1" } }),
    );
    expect(mocks.db.salesLineItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sale: expect.objectContaining({ businessId: "business-1" }),
        }),
      }),
    );
    expect(payload.metrics.total_items).toBe(0);
  });

  it("does not persist attacker input when inventory analysis fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.db.inventory.findMany.mockRejectedValue(new Error("contains-sensitive-details"));

    const response = await POST_INVENTORY_HEALTH(
      request("/api/ai/inventory-health", {
        method: "POST",
        body: { business_id: "business-1", unexpected: "do-not-store" },
      }),
    );

    expect(response.status).toBe(500);
    expect(mocks.db.aiInsightFailure.create).toHaveBeenCalledWith({
      data: {
        businessId: "business-1",
        functionName: "inventory_health",
        errorMessage: "Error",
        errorStack: null,
        inputData: null,
      },
    });
    consoleError.mockRestore();
  });

  it("blocks restricted users from queueing pricing analysis", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const response = await POST_PRICING_INVENTORY(
      request("/api/ai/pricing-inventory", {
        method: "POST",
        body: { business_id: "business-1" },
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("queues pricing analysis with resolved tenant and actor attribution", async () => {
    const response = await POST_PRICING_INVENTORY(
      request("/api/ai/pricing-inventory", {
        method: "POST",
        body: {
          business_id: "business-1",
          analysis_type: "inventory",
          margin_requirement: 0.4,
          supplier_lead_time_days: 14,
        },
      }),
    );

    expect(response.status).toBe(202);
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith(
      "actor-1",
      "business-1",
      "pricing.manage",
    );
    expect(mocks.emit).toHaveBeenCalledWith(
      "ai/pricing-inventory.analyze",
      {
        business_id: "business-1",
        analysis_type: "inventory",
        margin_requirement: 0.4,
        supplier_lead_time_days: 14,
        requested_by: "actor-1",
      },
    );
  });

  it("returns real tenant-scoped alert records instead of mocked success data", async () => {
    mocks.db.inventoryAlert.findMany.mockResolvedValue([
      {
        id: "alert-1",
        inventoryId: "inventory-1",
        alertType: "low_stock",
        severity: "high",
        message: "Stock is low",
        createdAt: new Date("2026-08-19T12:00:00.000Z"),
      },
    ]);

    const response = await GET_ALERTS(
      request("/api/ai/alerts?business_id=business-1&severity=high"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.db.inventoryAlert.findMany).toHaveBeenCalledWith({
      where: {
        businessId: "business-1",
        isRead: false,
        severity: "high",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: expect.any(Object),
    });
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "alert-1",
        inventory_id: "inventory-1",
        alert_type: "low_stock",
      }),
    ]);
  });

  it("blocks cross-tenant alert reads before querying alerts", async () => {
    const response = await GET_ALERTS(
      request("/api/ai/alerts?business_id=business-2"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.inventoryAlert.findMany).not.toHaveBeenCalled();
  });

  it("acknowledges only a scoped alert and attributes the authenticated actor", async () => {
    mocks.db.inventoryAlert.findFirst.mockResolvedValue({
      id: "alert-1",
      isRead: false,
    });

    const response = await POST_ALERT(
      request("/api/ai/alerts?business_id=business-1", {
        method: "POST",
        body: {
          action: "acknowledge",
          alert_id: "alert-1",
          user_id: "attacker-selected-user",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.db.inventoryAlert.findFirst).toHaveBeenCalledWith({
      where: { id: "alert-1", businessId: "business-1" },
      select: { id: true, isRead: true },
    });
    expect(mocks.db.inventoryAlert.updateMany).toHaveBeenCalledWith({
      where: {
        id: "alert-1",
        businessId: "business-1",
        isRead: false,
      },
      data: { isRead: true },
    });
    expect(mocks.db.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "acknowledge_inventory_alert",
        businessId: "business-1",
        entityId: "alert-1",
        userId: "actor-1",
      }),
    });
  });

  it("does not acknowledge an alert belonging to another business", async () => {
    const response = await POST_ALERT(
      request("/api/ai/alerts?business_id=business-1", {
        method: "POST",
        body: { action: "acknowledge", alert_id: "foreign-alert" },
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.db.inventoryAlert.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.systemAuditLog.create).not.toHaveBeenCalled();
  });

  it("blocks operations for a disabled business", async () => {
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: false });

    const response = await POST_PRICING_INVENTORY(
      request("/api/ai/pricing-inventory", {
        method: "POST",
        body: { business_id: "business-1" },
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.hasBusinessPermission).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });
});
