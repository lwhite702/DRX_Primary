import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ resolveAuthContext: vi.fn(), hasBusinessPermission: vi.fn(), businessClient: vi.fn() }));
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.resolveAuthContext }));
vi.mock("@/lib/auth/server-guards", () => ({ hasBusinessPermission: mocks.hasBusinessPermission }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));

import { resolveCustomerAccess } from "@/app/api/customers/_lib/server";
import { GET as GET_CUSTOMERS } from "@/app/api/customers/route";

const request = (path: string) => new NextRequest(`http://localhost${path}`);

describe("customer route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({ userId: "actor-1", businessId: "business-1" });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.businessClient.mockRejectedValue(new Error("FORBIDDEN: selected business is unavailable"));
  });

  it("rejects an unauthenticated request before permission lookup", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null });
    expect(await resolveCustomerAccess(request("/api/customers"), "customers.view")).toEqual({ ok: false, status: 401, error: "Unauthorized" });
    expect(mocks.hasBusinessPermission).not.toHaveBeenCalled();
  });

  it("requires the requested customer permission for POS compatibility routes", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);
    expect(await resolveCustomerAccess(request("/api/customers"), "customers.manage")).toEqual({ ok: false, status: 403, error: "Access denied" });
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith("actor-1", "business-1", "customers.manage");
  });

  it("returns the selected tenant only after Convex session and permission checks", async () => {
    expect(await resolveCustomerAccess(request("/api/customers"), "customers.view")).toEqual({ ok: true, userId: "actor-1", businessId: "business-1" });
  });

  it("sanitizes a rejected or inactive selected business from the standard route", async () => {
    const response = await GET_CUSTOMERS(request("/api/customers?business_id=foreign"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Access denied" });
  });
});
