import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveCustomerAccess: vi.fn(),
  hasBusinessPermission: vi.fn(),
  findCustomersForSearch: vi.fn(),
  ensureServerFlag: vi.fn(),
  resolveBusinessPrivacyPolicy: vi.fn(),
  decodeCustomerPii: vi.fn(),
  encodeCustomerPii: vi.fn(),
  mapCustomerToOperationalModel: vi.fn(),
  mapOperationalCustomerRecord: vi.fn(),
  createCustomerWithAudit: vi.fn(),
  canWriteField: vi.fn().mockReturnValue(true),
  db: {
    $queryRaw: vi.fn(),
    customers: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    sales: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/api/customers/_lib/server", () => ({
  resolveCustomerAccess: mocks.resolveCustomerAccess,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/customers/core/customer-search", () => ({
  findCustomersForSearch: mocks.findCustomersForSearch,
}));

vi.mock("@/lib/customers/core/customer-identity", () => ({
  mapOperationalCustomerRecord: mocks.mapOperationalCustomerRecord,
}));

vi.mock("@/lib/customers/core/customer-lifecycle", () => {
  class CustomerConflictError extends Error {
    constructor(readonly existingCustomerId: string) {
      super("A customer with that phone or email already exists");
    }
  }
  class CustomerLifecycleNotFoundError extends Error {}

  return {
    CustomerConflictError,
    CustomerLifecycleNotFoundError,
    createCustomerWithAudit: mocks.createCustomerWithAudit,
    updateCustomerWithAudit: vi.fn(),
  };
});

vi.mock("@/lib/posthog/server-flags", () => ({
  ensureServerFlag: mocks.ensureServerFlag,
}));

vi.mock("@/lib/privacy/privacy-resolution", () => ({
  resolveBusinessPrivacyPolicy: mocks.resolveBusinessPrivacyPolicy,
}));

vi.mock("@/lib/privacy/customer-pii", () => ({
  decodeCustomerPii: mocks.decodeCustomerPii,
  encodeCustomerPii: mocks.encodeCustomerPii,
}));

vi.mock("@/lib/privacy/privacy-policy", () => ({
  canWriteField: mocks.canWriteField,
}));

vi.mock("@/lib/customers/core/customer-normalizer", () => ({
  mapCustomerToOperationalModel: mocks.mapCustomerToOperationalModel,
  toNumberSafe: (value: unknown) => Number(value || 0),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  GET as GET_CUSTOMERS,
  POST as CREATE_CUSTOMER,
} from "@/app/api/customers/route";
import { GET as GET_CUSTOMER } from "@/app/api/customers/[id]/route";
import { CustomerConflictError } from "@/lib/customers/core/customer-lifecycle";

function request(path: string, method = "GET", body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("customer lifecycle routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCustomerAccess.mockResolvedValue({
      ok: true,
      userId: "actor-1",
      businessId: "business-1",
    });
    mocks.ensureServerFlag.mockResolvedValue(true);
    mocks.resolveBusinessPrivacyPolicy.mockResolvedValue({
      ephemeral_profiles: {
        enabled: true,
        allow_in_standard_customer_create: true,
        default_retention_days: 7,
      },
    });
    mocks.findCustomersForSearch.mockResolvedValue([]);
    mocks.decodeCustomerPii.mockResolvedValue({});
    mocks.encodeCustomerPii.mockResolvedValue({});
    mocks.mapCustomerToOperationalModel.mockImplementation((customer) => ({
      id: customer.id,
      is_active: customer.isActive,
    }));
    mocks.mapOperationalCustomerRecord.mockImplementation((customer) => ({
      id: customer.id,
      is_active: customer.isActive,
    }));
    mocks.db.$queryRaw.mockResolvedValue([]);
    mocks.db.sales.findMany.mockResolvedValue([]);
  });

  it("maps a tenant duplicate to a conflict without a second create", async () => {
    mocks.createCustomerWithAudit.mockRejectedValue(
      new CustomerConflictError("customer-existing"),
    );

    const response = await CREATE_CUSTOMER(
      request("/api/customers", "POST", { phone: "5551234567" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      error: "A customer with that phone or email already exists",
      existing_customer_id: "customer-existing",
    });
    expect(mocks.createCustomerWithAudit).toHaveBeenCalledTimes(1);
  });

  it("requires manage access and an inactive filter for the archived list", async () => {
    const response = await GET_CUSTOMERS(
      request("/api/customers?status=archived"),
    );

    expect(response.status).toBe(200);
    expect(mocks.resolveCustomerAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "customers.manage",
    );
    expect(mocks.findCustomersForSearch).toHaveBeenCalledWith({
      businessId: "business-1",
      search: "",
      limit: 50,
      offset: 0,
      isActive: false,
    });
  });

  it("does not reveal an archived profile to a view-only operator", async () => {
    mocks.db.customers.findFirst.mockResolvedValue({
      id: "customer-1",
      businessId: "business-1",
      isActive: false,
    });
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const response = await GET_CUSTOMER(request("/api/customers/customer-1"), {
      params: { id: "customer-1" },
    });

    expect(response.status).toBe(403);
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith(
      "actor-1",
      "business-1",
      "customers.manage",
    );
    expect(mocks.db.sales.findMany).not.toHaveBeenCalled();
  });

  it("returns only tenant-scoped persisted sales in customer history", async () => {
    mocks.db.customers.findFirst.mockResolvedValue({
      id: "customer-1",
      businessId: "business-1",
      isActive: true,
    });
    mocks.db.sales.findMany.mockResolvedValue([
      {
        id: "sale-1",
        orderNumber: "DRX-1001",
        orderStatus: "completed",
        subtotal: 10,
        taxAmount: 0.8,
        totalAmount: 10.8,
        paymentMethod: "cash",
        createdBy: "actor-1",
        createdAt: new Date("2026-08-20T14:00:00.000Z"),
      },
    ]);

    const response = await GET_CUSTOMER(request("/api/customers/customer-1"), {
      params: { id: "customer-1" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.db.customers.findFirst).toHaveBeenCalledWith({
      where: { id: "customer-1", businessId: "business-1" },
    });
    expect(mocks.db.sales.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: "business-1", customerId: "customer-1" },
        take: 50,
      }),
    );
    expect(payload.transaction_history).toEqual([
      expect.objectContaining({
        id: "sale-1",
        order_number: "DRX-1001",
        total_amount: 10.8,
      }),
    ]);
  });

  it("blocks customer creation with 400 when address is provided but disallowed by privacy policy", async () => {
    mocks.canWriteField.mockImplementation(
      (_policy, field) => field !== "address",
    );

    const response = await CREATE_CUSTOMER(
      request("/api/customers", "POST", {
        first_name: "Jane",
        phone: "5551234567",
        address: "123 Main St",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "Blocked by privacy policy: address",
    });
    expect(mocks.createCustomerWithAudit).not.toHaveBeenCalled();
  });

  it("succeeds when address is omitted or empty under restrictive privacy policy", async () => {
    mocks.canWriteField.mockImplementation(
      (_policy, field) => field !== "address",
    );
    mocks.createCustomerWithAudit.mockResolvedValue({
      id: "customer-new",
      isActive: true,
    });

    const response = await CREATE_CUSTOMER(
      request("/api/customers", "POST", {
        first_name: "Jane",
        phone: "5551234567",
        address: "   ",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      id: "customer-new",
      is_active: true,
    });
    expect(mocks.createCustomerWithAudit).toHaveBeenCalledTimes(1);
  });
});
