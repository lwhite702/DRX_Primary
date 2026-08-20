import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  hasBusinessPermission: vi.fn(),
  db: {
    businessProfile: {
      findUnique: vi.fn(),
    },
    businessSettings: {
      findFirst: vi.fn(),
    },
    customers: {
      create: vi.fn(),
    },
  },
  encodeCustomerPii: vi.fn(),
  decodeCustomerPii: vi.fn(),
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/privacy/customer-pii", () => ({
  encodeCustomerPii: mocks.encodeCustomerPii,
  decodeCustomerPii: mocks.decodeCustomerPii,
}));

import { POST } from "@/app/api/customers/route";

describe("Customers API ephemeral controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "biz_1",
    });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: true });
    mocks.encodeCustomerPii.mockResolvedValue({
      aliasEncrypted: "enc",
      firstNameEncrypted: null,
      phoneEncrypted: null,
      emailEncrypted: null,
      addressEncrypted: null,
      notesEncrypted: null,
      aliasHash: "hash",
      phoneHash: null,
      emailHash: null,
      piiEncryptionVersion: 1,
    });
    mocks.decodeCustomerPii.mockResolvedValue({
      alias: "Jay",
      first_name: null,
      phone: null,
      email: null,
      address: null,
      notes: null,
    });
  });

  it("blocks standard customer ephemeral creation when disabled", async () => {
    mocks.db.businessSettings.findFirst.mockResolvedValue({
      settingsData: {
        privacy_protocol: {
          ephemeral_profiles: {
            enabled: true,
            default_retention_days: 7,
            allow_in_standard_customer_create: false,
          },
        },
      },
    });

    const req = new NextRequest("http://localhost:3000/api/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        alias: "Jay",
        ephemeral: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Ephemeral profile creation is disabled/i);
    expect(mocks.db.customers.create).not.toHaveBeenCalled();
  });

  it("creates ephemeral customer when allowed", async () => {
    mocks.db.businessSettings.findFirst.mockResolvedValue({
      settingsData: {
        privacy_protocol: {
          ephemeral_profiles: {
            enabled: true,
            default_retention_days: 7,
            allow_in_standard_customer_create: true,
          },
        },
      },
    });

    mocks.db.customers.create.mockResolvedValue({
      id: "cust_1",
      businessId: "biz_1",
      alias: null,
      firstName: null,
      lastName: null,
      phoneNumber: null,
      email: null,
      address: null,
      notes: null,
      city: null,
      state: null,
      zipCode: null,
      customerType: "retail",
      totalPurchases: 0,
      totalCreditUsed: 0,
      fixedPricePerGram: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
      isActive: true,
      ephemeral: true,
      ephemeralExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const req = new NextRequest("http://localhost:3000/api/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        alias: "Jay",
        ephemeral: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.ephemeral).toBe(true);
    expect(mocks.db.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ephemeral: true,
          ephemeralExpiresAt: expect.any(Date),
        }),
      }),
    );
  });
});
