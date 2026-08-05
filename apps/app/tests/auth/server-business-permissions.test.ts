import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOwnedBusiness: vi.fn(),
  findUserRole: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: vi.fn(),
  isAuthBypassEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/db", () => ({
  db: {
    businessProfile: { findFirst: mocks.findOwnedBusiness },
    userRole: { findFirst: mocks.findUserRole },
  },
}));

import { hasBusinessPermission } from "@/lib/auth/server-guards";

describe("hasBusinessPermission", () => {
  beforeEach(() => {
    mocks.findOwnedBusiness.mockReset();
    mocks.findUserRole.mockReset();
  });

  it("allows the business owner", async () => {
    mocks.findOwnedBusiness.mockResolvedValue({ id: "business-1" });
    await expect(
      hasBusinessPermission("user-1", "business-1", "audit.view"),
    ).resolves.toBe(true);
  });

  it("uses canonical role permissions when explicit permissions are empty", async () => {
    mocks.findOwnedBusiness.mockResolvedValue(null);
    mocks.findUserRole.mockResolvedValue({ role: "manager", permissions: {} });
    await expect(
      hasBusinessPermission("user-1", "business-1", "inventory.manage"),
    ).resolves.toBe(true);
  });

  it("denies a cashier an inventory management mutation", async () => {
    mocks.findOwnedBusiness.mockResolvedValue(null);
    mocks.findUserRole.mockResolvedValue({ role: "cashier", permissions: {} });
    await expect(
      hasBusinessPermission("user-1", "business-1", "inventory.manage"),
    ).resolves.toBe(false);
  });
});
