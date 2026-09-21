import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ businessClient: vi.fn(), query: vi.fn(), mutation: vi.fn(), encode: vi.fn(), decode: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));
vi.mock("@/lib/privacy/customer-pii", () => ({ encodeCustomerPii: mocks.encode, decodeCustomerPii: mocks.decode }));
import { POST } from "@/app/api/pos/customers/quick-create/route";

const customer = { _id: "customer-1", businessId: "business-1", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 0, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, ephemeral: true, ephemeralExpiresAt: Date.now() + 1000, createdAt: Date.now(), updatedAt: Date.now() };

describe("POS quick-create ephemeral behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({ client: { query: mocks.query, mutation: mocks.mutation }, businessId: "business-1", expectedUserId: "operator-1" });
    mocks.query.mockResolvedValue({ ephemeral_profiles: { enabled: true, default_retention_days: 7 } });
    mocks.mutation.mockResolvedValue({ created: true, customer });
    mocks.encode.mockResolvedValue({ aliasEncrypted: "enc", firstNameEncrypted: null, phoneEncrypted: "enc-phone", emailEncrypted: null, addressEncrypted: null, notesEncrypted: null, aliasHash: "hash", phoneHash: "phone-hash", emailHash: null, piiEncryptionVersion: 1 });
    mocks.decode.mockResolvedValue({ alias: "Customer 4567", first_name: null, phone: "5551234567", email: null, address: null, notes: null });
  });

  it("atomically creates an ephemeral Convex customer", async () => {
    const response = await POST(new NextRequest("http://localhost/api/pos/customers/quick-create", { method: "POST", body: JSON.stringify({ phone: "555-123-4567" }) }));
    expect(response.status).toBe(201);
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ matchBy: "phone", phoneHash: "phone-hash", ephemeral: true, ephemeralExpiresAt: expect.any(Number) }));
    expect(await response.json()).toMatchObject({ id: "customer-1", phone: "5551234567", ephemeral: true });
  });

  it("returns an existing matching customer without creating a second profile", async () => {
    mocks.mutation.mockResolvedValue({ created: false, customer });
    const response = await POST(new NextRequest("http://localhost/api/pos/customers/quick-create", { method: "POST", body: JSON.stringify({ phone: "5551234567" }) }));
    expect(response.status).toBe(200);
  });
});
