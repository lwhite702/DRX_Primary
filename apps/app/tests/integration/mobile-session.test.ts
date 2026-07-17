import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    businessProfile: { findFirst: vi.fn() },
    userRole: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/mobile/v1/session/route";

describe("GET /api/mobile/v1/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.businessProfile.findFirst.mockResolvedValue(null);
    mocks.db.userRole.findFirst.mockResolvedValue(null);
    mocks.db.user.findFirst.mockResolvedValue(null);
  });

  it("rejects requests without a verified Clerk user", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns the owner workspace and role permissions", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_owner" });
    mocks.db.businessProfile.findFirst.mockResolvedValue({
      id: "business_1",
      businessName: "Deelrx Demo",
    });
    mocks.db.user.findFirst.mockResolvedValue({
      name: "Lee",
      email: "lee@example.com",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      operator_id: "user_owner",
      display_name: "Lee",
      business_id: "business_1",
      business_name: "Deelrx Demo",
      roles: ["owner"],
    });
    expect(body.permissions).toContain("system.manage");
  });

  it("returns an assigned operator role and merges explicit permissions", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_cashier" });
    mocks.db.userRole.findFirst.mockResolvedValue({
      role: "cashier",
      permissions: { "inventory.manage": true, "reports.view_all": false },
      business: { id: "business_2", businessName: "Deelrx Store" },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roles).toEqual(["cashier"]);
    expect(body.permissions).toContain("sales.create");
    expect(body.permissions).toContain("inventory.manage");
    expect(body.permissions).not.toContain("reports.view_all");
  });

  it("explains when a Clerk user has no Deelrx business", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_unprovisioned" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("MOBILE_ACCOUNT_NOT_PROVISIONED");
  });
});
