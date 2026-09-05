import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  hasBusinessPermission: vi.fn(),
  db: {
    businessProfile: {
      findUnique: vi.fn(),
    },
    customers: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
  cleanPhone: (value: string) => value.replace(/[^0-9]/g, ""),
  toNumber: (value: unknown) => Number(value),
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { resolveCustomerAccess } from "@/app/api/customers/_lib/server";
import {
  GET as GET_CUSTOMERS,
  POST as CREATE_CUSTOMER,
} from "@/app/api/customers/route";
import {
  GET as GET_CUSTOMER,
  PATCH as UPDATE_CUSTOMER,
} from "@/app/api/customers/[id]/route";
import { GET as LOOKUP_POS_CUSTOMER } from "@/app/api/pos/customers/route";
import { POST as QUICK_CREATE_CUSTOMER } from "@/app/api/pos/customers/quick-create/route";

function request(path: string, method = "GET", body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const detailContext = { params: { id: "customer-1" } };

describe("customer route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "actor-1",
      businessId: "business-1",
    });
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: true });
    mocks.hasBusinessPermission.mockResolvedValue(true);
  });

  it("rejects an unauthenticated request before business or customer access", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: null,
      businessId: null,
    });

    const result = await resolveCustomerAccess(
      request("/api/customers"),
      "customers.view",
    );

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(mocks.db.businessProfile.findUnique).not.toHaveBeenCalled();
    expect(mocks.hasBusinessPermission).not.toHaveBeenCalled();
  });

  it("rejects a foreign selected business before any customer query", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "actor-1",
      businessId: null,
    });

    const response = await GET_CUSTOMERS(
      request("/api/customers?business_id=business-2"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.businessProfile.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.customers.findMany).not.toHaveBeenCalled();
  });

  it("requires customers.view before returning standard or POS customer PII", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const standardResponse = await GET_CUSTOMERS(request("/api/customers"));
    const posResponse = await LOOKUP_POS_CUSTOMER(
      request("/api/pos/customers?search=Jane"),
    );

    expect(standardResponse.status).toBe(403);
    expect(posResponse.status).toBe(403);
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith(
      "actor-1",
      "business-1",
      "customers.view",
    );
    expect(mocks.db.customers.findMany).not.toHaveBeenCalled();
  });

  it("requires customers.view before a tenant-scoped customer detail lookup", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const response = await GET_CUSTOMER(
      request("/api/customers/customer-1"),
      detailContext,
    );

    expect(response.status).toBe(403);
    expect(mocks.db.customers.findFirst).not.toHaveBeenCalled();
  });

  it("requires customers.manage before standard and POS customer creation", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const standardResponse = await CREATE_CUSTOMER(
      request("/api/customers", "POST", { alias: "Restricted" }),
    );
    const posResponse = await QUICK_CREATE_CUSTOMER(
      request("/api/pos/customers/quick-create", "POST", {
        phone: "5551234",
      }),
    );

    expect(standardResponse.status).toBe(403);
    expect(posResponse.status).toBe(403);
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith(
      "actor-1",
      "business-1",
      "customers.manage",
    );
    expect(mocks.db.customers.create).not.toHaveBeenCalled();
  });

  it("requires customers.manage before loading or updating a customer", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const response = await UPDATE_CUSTOMER(
      request("/api/customers/customer-1", "PATCH", { alias: "Changed" }),
      detailContext,
    );

    expect(response.status).toBe(403);
    expect(mocks.db.customers.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.customers.update).not.toHaveBeenCalled();
  });

  it("blocks customer access for a disabled business", async () => {
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: false });

    const response = await GET_CUSTOMERS(request("/api/customers"));

    expect(response.status).toBe(403);
    expect(mocks.hasBusinessPermission).not.toHaveBeenCalled();
    expect(mocks.db.customers.findMany).not.toHaveBeenCalled();
  });
});
