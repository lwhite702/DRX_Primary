import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
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
    mocks.db.user.findFirst.mockResolvedValue({
      name: "Lee",
      email: "lee@example.com",
      role: "OWNER",
      status: "ACTIVE",
      tenant: {
        id: "business_1",
        businessName: "Deelrx Demo",
        ownerId: "user_owner",
        isActive: true,
      },
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
      email: "lee@example.com",
    });
    expect(body).not.toHaveProperty("beta_access");
    expect(body).not.toHaveProperty("feature_flags");
    expect(body.permissions).toContain("system.manage");
  });

  it("returns an assigned operator role and merges explicit permissions", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_cashier" });
    mocks.db.user.findFirst.mockResolvedValue({
      name: "Cashier",
      email: "cashier@example.com",
      role: "MEMBER",
      status: "ACTIVE",
      tenant: {
        id: "business_2",
        businessName: "Deelrx Store",
        ownerId: "user_owner",
        isActive: true,
      },
    });
    mocks.db.userRole.findFirst.mockResolvedValue({
      role: "cashier",
      permissions: { "inventory.manage": true, "reports.view_all": false },
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

  it("blocks a suspended local operator before returning tenant data", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_suspended" });
    mocks.db.user.findFirst.mockResolvedValue({
      name: "Suspended Operator",
      email: "suspended@example.com",
      role: "MEMBER",
      status: "SUSPENDED",
      tenant: {
        id: "business_3",
        businessName: "Private Store",
        ownerId: "user_owner",
        isActive: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("MOBILE_ACCOUNT_INACTIVE");
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
  });

  it("does not merge permissions from another tenant into an owner session", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_owner" });
    mocks.db.user.findFirst.mockResolvedValue({
      name: "Owner",
      email: "owner@example.com",
      role: "OWNER",
      status: "ACTIVE",
      tenant: {
        id: "business_1",
        businessName: "Owner Store",
        ownerId: "user_owner",
        isActive: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roles).toEqual(["owner"]);
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
  });
});
