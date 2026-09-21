import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ businessClient: vi.fn(), query: vi.fn(), decode: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));
vi.mock("@/lib/privacy/customer-pii", () => ({ decodeCustomerPii: mocks.decode }));
import { GET } from "@/app/api/pos/customers/route";

describe("POS customers lookup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({ client: { query: mocks.query }, businessId: "business-1", expectedUserId: "operator-1" });
    mocks.query.mockResolvedValue([{ _id: "customer-1", businessId: "business-1", totalPurchasesCents: 0, totalCreditUsedCents: 2500, creditLimitCents: 10000, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 }]);
    mocks.decode.mockResolvedValue({ alias: "Jay", first_name: null, phone: "5551234567", email: null, address: null, notes: null });
  });

  it("searches bounded Convex customer records and computes remaining credit", async () => {
    const response = await GET(new NextRequest("http://localhost/api/pos/customers?search=Jay"));
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { businessId: "business-1", expectedUserId: "operator-1", isActive: true, windowSize: 240 });
    expect((await response.json()).data).toEqual([{ id: "customer-1", phone: "5551234567", alias: "Jay", remainingCredit: 75 }]);
  });

  it("returns a sanitized availability error without backend details", async () => {
    mocks.query.mockRejectedValue(new Error("private backend detail"));
    const response = await GET(new NextRequest("http://localhost/api/pos/customers?search=Jay"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private backend detail");
  });
});
