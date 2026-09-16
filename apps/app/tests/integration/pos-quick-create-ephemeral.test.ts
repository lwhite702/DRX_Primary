import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  hasBusinessPermission: vi.fn(),
  db: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    businessProfile: {
      findUnique: vi.fn(),
    },
    businessSettings: {
      findFirst: vi.fn(),
    },
    customers: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    systemAuditLog: {
      create: vi.fn(),
    },
  },
  encodeCustomerPii: vi.fn(),
  decodeCustomerPii: vi.fn(),
  getCustomerDisplayName: vi.fn(),
  hashLookupValue: vi.fn(),
  hashPhoneLookupCandidates: vi.fn(),
  hashEmailLookupCandidates: vi.fn(),
  sanitizePiiInput: vi.fn(),
  resolveBusinessPrivacyPolicy: vi.fn(),
}));

vi.mock("@/lib/privacy/privacy-resolution", () => ({
  resolveBusinessPrivacyPolicy: mocks.resolveBusinessPrivacyPolicy,
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
  getCustomerDisplayName: mocks.getCustomerDisplayName,
}));

vi.mock("@/lib/privacy/crypto", () => ({
  hashLookupValue: mocks.hashLookupValue,
  sanitizePiiInput: mocks.sanitizePiiInput,
}));

vi.mock("@/lib/privacy/pii-hash", () => ({
  hashAliasLookup: vi.fn(),
  hashAliasLookupCandidates: vi.fn().mockResolvedValue([]),
  buildDeterministicLookupHashes: vi.fn().mockResolvedValue({
    aliasHash: null,
    phoneHash: null,
    emailHash: null,
    hashVersion: 1,
  }),
  hashPhoneLookupCandidates: mocks.hashPhoneLookupCandidates,
  hashEmailLookupCandidates: mocks.hashEmailLookupCandidates,
}));

import { POST } from "@/app/api/pos/customers/quick-create/route";

describe("POS quick-create ephemeral behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "biz_1",
    });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.db.businessProfile.findUnique.mockResolvedValue({ isActive: true });
    mocks.db.$transaction.mockImplementation(async (callback: any) =>
      callback(mocks.db),
    );
    mocks.db.$queryRaw.mockResolvedValue([]);
    mocks.db.systemAuditLog.create.mockResolvedValue({});
    mocks.hashPhoneLookupCandidates.mockResolvedValue(["hash-phone"]);
    mocks.hashEmailLookupCandidates.mockResolvedValue([]);
    mocks.hashLookupValue.mockResolvedValue(null);
    mocks.sanitizePiiInput.mockImplementation((value: unknown) =>
      typeof value === "string" ? value.trim() : null,
    );
    mocks.db.customers.findFirst.mockResolvedValue(null);
    mocks.encodeCustomerPii.mockResolvedValue({
      aliasEncrypted: "enc",
      firstNameEncrypted: null,
      phoneEncrypted: "enc-phone",
      emailEncrypted: null,
      addressEncrypted: null,
      notesEncrypted: null,
      aliasHash: "hash",
      phoneHash: "hash-phone",
      emailHash: null,
      piiEncryptionVersion: 1,
    });
    mocks.decodeCustomerPii.mockResolvedValue({
      alias: "Customer 1234",
      first_name: null,
      phone: "5551234",
      email: null,
      address: null,
      notes: null,
    });
    mocks.getCustomerDisplayName.mockReturnValue("Customer 1234");
  });

  it("creates ephemeral customer when ephemeral profiles are enabled", async () => {
    mocks.resolveBusinessPrivacyPolicy.mockResolvedValue({
      ephemeral_profiles: {
        enabled: true,
        default_retention_days: 7,
      },
    });
    mocks.db.customers.create.mockResolvedValue({
      id: "cust_1",
      ephemeral: true,
      ephemeralExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/pos/customers/quick-create",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "5551234" }),
      },
    );
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

  it("creates non-ephemeral customer when ephemeral profiles are disabled", async () => {
    mocks.resolveBusinessPrivacyPolicy.mockResolvedValue({
      ephemeral_profiles: {
        enabled: false,
        default_retention_days: 7,
      },
    });
    mocks.db.customers.create.mockResolvedValue({
      id: "cust_2",
      ephemeral: false,
      ephemeralExpiresAt: null,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/pos/customers/quick-create",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "5551234" }),
      },
    );
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.ephemeral).toBe(false);
    expect(mocks.db.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ephemeral: false,
          ephemeralExpiresAt: null,
        }),
      }),
    );
  });
});
