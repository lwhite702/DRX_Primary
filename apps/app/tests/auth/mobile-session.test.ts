import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  getUser: vi.fn(),
  db: {
    businessProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    userRole: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/mobile/v1/session/route";

describe("GET /api/mobile/v1/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clerkClient.mockResolvedValue({ users: { getUser: mocks.getUser } });
    mocks.getUser.mockResolvedValue({
      fullName: "Lee Operator",
      firstName: "Lee",
      lastName: "Operator",
      primaryEmailAddress: { emailAddress: "operator@example.com" },
    });
    mocks.db.businessProfile.findUnique.mockResolvedValue(null);
    mocks.db.businessProfile.findFirst.mockResolvedValue(null);
    mocks.db.userRole.findFirst.mockResolvedValue(null);
  });

  it("rejects requests without a verified Clerk user", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns the active owner workspace", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_owner", orgId: null });
    mocks.db.businessProfile.findFirst.mockResolvedValue({
      id: "business_1",
      businessName: "Deelrx Demo",
      ownerId: "user_owner",
      isActive: true,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      operatorId: "user_owner",
      displayName: "Lee Operator",
      businessId: "business_1",
      businessName: "Deelrx Demo",
      roles: ["owner"],
      permissions: ["*"],
      email: "operator@example.com",
    });
  });

  it("returns assigned operator permissions", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_cashier", orgId: null });
    mocks.db.businessProfile.findFirst.mockResolvedValue({
      id: "business_2",
      businessName: "Deelrx Store",
      ownerId: "user_owner",
      isActive: true,
    });
    mocks.db.userRole.findFirst.mockResolvedValue({
      role: "cashier",
      permissions: ["inventory.manage"],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roles).toEqual(["cashier"]);
    expect(body.permissions).toEqual(["inventory.manage"]);
  });

  it("explains when a Clerk user has no active business", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_unprovisioned", orgId: null });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "No active DRX business is available for this operator.",
    });
  });
});
