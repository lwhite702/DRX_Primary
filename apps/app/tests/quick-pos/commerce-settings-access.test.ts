import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  business: vi.fn(),
  owned: vi.fn(),
  role: vi.fn(),
  settings: vi.fn(),
  inventory: vi.fn(),
  customers: vi.fn(),
  upsert: vi.fn(),
  transaction: vi.fn(),
}));

// Keep the real route, tenant resolver and permission policy together.
// Only the identity provider and database boundary use synthetic fixtures.
vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
  isAuthBypassEnabled: () => false,
}));
vi.mock("@/lib/db", () => ({
  db: {
    businessProfile: { findUnique: mocks.business, findFirst: mocks.owned },
    userRole: { findFirst: mocks.role },
    businessSettings: { findUnique: mocks.settings, upsert: mocks.upsert },
    inventory: { findMany: mocks.inventory },
    customers: { findMany: mocks.customers },
    $transaction: mocks.transaction,
  },
}));

import { GET, PATCH } from "@/app/api/pos/commerce-settings/route";
import { getDefaultCommerceSettings } from "@/lib/commerce/config";

const businessId = "business-a";
const merchant = {
  ...getDefaultCommerceSettings().merchant,
  dispatchSlaMinutes: 8,
};
const patch = () =>
  PATCH(
    new NextRequest("https://app.example.test/api/pos/commerce-settings", {
      method: "PATCH",
      body: JSON.stringify({ merchant }),
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("commerce settings authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "operator-a", orgId: "org-a" });
    mocks.business.mockResolvedValue({ id: businessId });
    mocks.owned.mockResolvedValue(null);
    mocks.role.mockResolvedValue(null);
    mocks.settings.mockResolvedValue(null);
    mocks.inventory.mockResolvedValue([]);
    mocks.customers.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (run) =>
      run({
        businessSettings: { findUnique: mocks.settings, upsert: mocks.upsert },
      }),
    );
    mocks.upsert.mockImplementation(async ({ where, update }) => {
      mocks.settings.mockImplementation(async (query) =>
        query.where.businessId === where.businessId ? update : null,
      );
      return update;
    });
  });

  it("lets an owner with no explicit role record load and save their settings", async () => {
    mocks.owned.mockImplementation(async ({ where }) =>
      where.id === businessId && where.ownerId === "operator-a"
        ? { id: businessId }
        : null,
    );
    expect((await GET()).status).toBe(200);
    expect((await patch()).status).toBe(200);
    expect(await (await GET()).json()).toMatchObject({ businessId, merchant });
  });

  it.each(["owner", "admin", "manager"])(
    "honors %s role defaults without explicit permissions",
    async (role) => {
      mocks.role.mockImplementation(async ({ where }) =>
        where.businessId === businessId
          ? { id: "membership-a", role, permissions: {} }
          : null,
      );
      expect((await GET()).status).toBe(200);
      expect((await patch()).status).toBe(200);
    },
  );

  it.each(["cashier", "staff", "supervisor"])(
    "denies %s read and write access",
    async (role) => {
      mocks.role.mockResolvedValue({
        id: "membership-a",
        role,
        permissions: {},
      });
      expect((await GET()).status).toBe(403);
      expect((await patch()).status).toBe(403);
      expect(mocks.settings).not.toHaveBeenCalled();
      expect(mocks.inventory).not.toHaveBeenCalled();
      expect(mocks.customers).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it("does not borrow an explicit permission or admin role from another business", async () => {
    mocks.role.mockImplementation(async ({ where }) =>
      where.businessId === businessId
        ? { id: "membership-a", role: "cashier", permissions: {} }
        : {
            id: "membership-b",
            role: "admin",
            permissions: { "settings.configure_pos": true },
          },
    );
    expect((await GET()).status).toBe(403);
    expect((await patch()).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("allows an explicit permission only in the active business", async () => {
    mocks.role.mockImplementation(async ({ where }) =>
      where.businessId === businessId
        ? {
            id: "membership-a",
            role: "staff",
            permissions: { "settings.configure_pos": true },
          }
        : null,
    );
    expect((await GET()).status).toBe(200);
    expect((await patch()).status).toBe(200);
  });

  it("denies a signed-in user with no membership in the selected organization", async () => {
    expect((await GET()).status).toBe(401);
    expect((await patch()).status).toBe(401);
    expect(mocks.settings).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies unauthenticated reads and writes", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });
    expect((await GET()).status).toBe(401);
    expect((await patch()).status).toBe(401);
    expect(mocks.business).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
