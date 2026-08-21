import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    customers: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/lib/privacy/customer-pii", () => ({
  decodeCustomerPii: vi.fn(),
}));

import { findCustomersForSearch } from "@/lib/customers/core/customer-search";

describe("customer search status scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it("uses the requested inactive scope when listing archived customers", async () => {
    await findCustomersForSearch({
      businessId: "business-1",
      isActive: false,
      limit: 25,
      offset: 5,
    });

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { businessId: "business-1", isActive: false },
      orderBy: { createdAt: "desc" },
      take: 25,
      skip: 5,
    });
  });
});
