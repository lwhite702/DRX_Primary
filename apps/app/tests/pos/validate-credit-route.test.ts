import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  validateCreditBalance: vi.fn(),
  db: { marker: "db" },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/pos/core", () => ({
  validateCreditBalance: mocks.validateCreditBalance,
}));

import { GET } from "@/app/api/pos/validate-credit/route";

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/pos/validate-credit${query}`);
}

describe("GET /api/pos/validate-credit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
    });
    mocks.validateCreditBalance.mockResolvedValue({
      valid: true,
      currentBalance: 20,
      maxLimit: 100,
      remaining: 80,
      warning: null,
    });
  });

  it("returns 401 when auth context is missing", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null });

    const res = await GET(makeRequest("?customerId=123&amount=25"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(mocks.validateCreditBalance).not.toHaveBeenCalled();
  });

  it("returns valid immediately when customerId is absent", async () => {
    const res = await GET(makeRequest("?amount=25"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ valid: true });
    expect(mocks.validateCreditBalance).not.toHaveBeenCalled();
  });

  it("uses canonical credit-limit validation without customer purchase fallbacks", async () => {
    mocks.validateCreditBalance.mockResolvedValue({
      valid: false,
      currentBalance: 90,
      maxLimit: 100,
      remaining: 10,
      warning: "Credit limit exceeded",
    });

    const res = await GET(
      makeRequest("?customerId=launch-verify-13&amount=25"),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.validateCreditBalance).toHaveBeenCalledWith(
      mocks.db,
      "business_123",
      "33333333-3333-4333-8333-333333333333",
      25,
    );
    expect(data).toEqual({
      valid: false,
      currentBalance: 90,
      maxLimit: 100,
      remaining: 10,
      warning: "Credit limit exceeded",
    });
  });
});
