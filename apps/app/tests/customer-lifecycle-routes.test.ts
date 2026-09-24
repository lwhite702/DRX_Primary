import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  businessClient: vi.fn(), query: vi.fn(), mutation: vi.fn(), encode: vi.fn(), decode: vi.fn(), canWrite: vi.fn(),
}));

vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));
vi.mock("@/lib/privacy/customer-pii", () => ({ encodeCustomerPii: mocks.encode, decodeCustomerPii: mocks.decode }));
vi.mock("@/lib/privacy/privacy-policy", () => ({ canWriteField: mocks.canWrite }));

import { GET as GET_CUSTOMERS, POST as CREATE_CUSTOMER } from "@/app/api/customers/route";
import { GET as GET_CUSTOMER, PATCH as UPDATE_CUSTOMER } from "@/app/api/customers/[id]/route";

const policy = {
  fields: {},
  ephemeral_profiles: { enabled: true, allow_in_standard_customer_create: true, default_retention_days: 7 },
};
const customer = {
  _id: "customer-1", businessId: "business-1", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 0,
  purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, customerType: "retail",
  createdAt: Date.parse("2026-09-19T00:00:00.000Z"), updatedAt: Date.parse("2026-09-19T00:00:00.000Z"),
};

function request(path: string, method = "GET", body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
}

describe("customer lifecycle routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({ client: { query: mocks.query, mutation: mocks.mutation }, businessId: "business-1", expectedUserId: "actor-1" });
    mocks.canWrite.mockReturnValue(true);
    mocks.encode.mockResolvedValue({ aliasEncrypted: "encrypted-alias", firstNameEncrypted: null, phoneEncrypted: "encrypted-phone", emailEncrypted: null, addressEncrypted: null, notesEncrypted: null, aliasHash: "alias-hash", phoneHash: "phone-hash", emailHash: null, piiEncryptionVersion: 1 });
    mocks.decode.mockResolvedValue({ alias: "Jay", first_name: null, phone: "5551234567", email: null, address: null, notes: null });
    mocks.query.mockImplementation((_ref, args) => {
      if ("isActive" in args) return Promise.resolve([]);
      if ("customerId" in args) return Promise.resolve({ customer, metrics: null, transactionHistory: [] });
      return Promise.resolve(policy);
    });
    mocks.mutation.mockResolvedValue(customer);
  });

  it("requests archived customers from Convex under the selected operator context", async () => {
    const response = await GET_CUSTOMERS(request("/api/customers?status=archived"));
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { businessId: "business-1", expectedUserId: "actor-1", isActive: false, windowSize: 50 });
  });

  it("maps a Convex duplicate to the existing conflict response", async () => {
    mocks.mutation.mockRejectedValue(new Error("CONFLICT: customer-existing"));
    const response = await CREATE_CUSTOMER(request("/api/customers", "POST", { phone: "5551234567" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "A customer with that phone or email already exists", existing_customer_id: "customer-existing" });
  });

  it("blocks disallowed PII before the Convex mutation", async () => {
    mocks.canWrite.mockImplementation((_policy, field) => field !== "address");
    const response = await CREATE_CUSTOMER(request("/api/customers", "POST", { alias: "Jay", address: "Synthetic address" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Blocked by privacy policy: address" });
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("stores money as integer cents and nulls address fields when collection is disabled", async () => {
    mocks.canWrite.mockImplementation((_policy, field) => field !== "address");
    const response = await CREATE_CUSTOMER(request("/api/customers", "POST", { alias: "Jay", city: "Denver", fixed_price_per_gram: "12.50", credit_limit: "75.00" }));
    expect(response.status).toBe(201);
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ city: null, state: null, zipCode: null, fixedPricePerGramCents: 1250, creditLimitCents: 7500 }));
  });

  it("preserves tenant-scoped Convex sales in detail history", async () => {
    mocks.query.mockImplementation((_ref, args) => "customerId" in args
      ? Promise.resolve({ customer, metrics: { sales_all_time: 10.8 }, transactionHistory: [{ id: "sale-1", order_number: "DRX-1001", total_amount: 10.8 }] })
      : Promise.resolve(policy));
    const response = await GET_CUSTOMER(request("/api/customers/customer-1"), { params: { id: "customer-1" } });
    expect(response.status).toBe(200);
    expect((await response.json()).transaction_history).toEqual([{ id: "sale-1", order_number: "DRX-1001", total_amount: 10.8 }]);
  });

  it("updates encrypted fields and money in one Convex mutation", async () => {
    const response = await UPDATE_CUSTOMER(request("/api/customers/customer-1", "PATCH", { alias: "Updated", credit_limit: "125.00" }), { params: { id: "customer-1" } });
    expect(response.status).toBe(200);
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ customerId: "customer-1", aliasEncrypted: "encrypted-alias", creditLimitCents: 12500, changedFields: ["alias", "credit_limit"] }));
  });

  it("keeps ephemeral creation behind the business privacy policy", async () => {
    mocks.query.mockImplementation((_ref, args) => "isActive" in args ? Promise.resolve([]) : Promise.resolve({ ...policy, ephemeral_profiles: { ...policy.ephemeral_profiles, allow_in_standard_customer_create: false } }));
    const response = await CREATE_CUSTOMER(request("/api/customers", "POST", { alias: "Jay", ephemeral: true }));
    expect(response.status).toBe(400);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
});
