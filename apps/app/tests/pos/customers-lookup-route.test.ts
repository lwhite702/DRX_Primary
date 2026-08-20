import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  hasBusinessPermission: vi.fn(),
  ensureServerFlag: vi.fn(),
  lookupPosCustomerCandidates: vi.fn(),
  db: {
    businessProfile: {
      findUnique: vi.fn(),
    },
    customers: {
      findMany: vi.fn(),
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

vi.mock("@/lib/posthog/server-flags", () => ({
  ensureServerFlag: mocks.ensureServerFlag,
}));

vi.mock("@/lib/customers/core/customer-search", () => ({
  lookupPosCustomerCandidates: mocks.lookupPosCustomerCandidates,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET } from "@/app/api/pos/customers/route";

describe("POS customers lookup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({ userId: "u_1", businessId: "biz_1" });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: true });
  });

  it("uses deterministic lookup path when feature is enabled", async () => {
    mocks.ensureServerFlag.mockResolvedValue(true);
    mocks.lookupPosCustomerCandidates.mockResolvedValue([
      { id: "c1", phone: "5551234", alias: "Jane", remainingCredit: 12 },
    ]);

    const req = new NextRequest("http://localhost:3000/api/pos/customers?search=Jane");
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.lookupPosCustomerCandidates).toHaveBeenCalledWith({
      businessId: "biz_1",
      search: "Jane",
      limit: 10,
    });
    expect(payload.count).toBe(1);
  });

  it("falls back to legacy phone lookup path when feature is disabled", async () => {
    mocks.ensureServerFlag.mockResolvedValue(false);
    mocks.db.customers.findMany.mockResolvedValue([
      {
        id: "c2",
        firstName: "Legacy",
        lastName: "Customer",
        phoneNumber: "5557777",
        creditLimits: [{ maxCreditLimit: 100, currentBalance: 25 }],
      },
    ]);

    const req = new NextRequest("http://localhost:3000/api/pos/customers?phone=555-7777");
    const res = await GET(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.db.customers.findMany).toHaveBeenCalled();
    expect(payload.items[0].alias).toBe("Legacy Customer");
    expect(payload.items[0].remainingCredit).toBe(75);
  });
});
