import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  businessId: "business-a",
  canManageCustomers: true,
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-business", () => ({
  useBusiness: () => ({
    business: { id: mocks.businessId },
    settings: {},
    loading: false,
  }),
}));

vi.mock("@/components/providers/customer-provider", () => ({
  useCustomerContext: () => ({
    customers: [],
    loading: false,
    syncStatus: "snapshot",
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({
    loading: false,
    hasPermission: (permission: string) =>
      permission === "customers.manage" && mocks.canManageCustomers,
  }),
}));

vi.mock("@/components/ui/tour", () => ({
  Tour: () => null,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), promise: vi.fn() },
}));

import CustomersPage from "@/app/(app)/customers/page";

describe("customer list business switching", () => {
  beforeEach(() => {
    mocks.businessId = "business-a";
    mocks.canManageCustomers = true;
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears archived customers when the next business cannot manage them", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          {
            id: "customer-a",
            business_id: "business-a",
            first_name: "Archived",
            last_name: "Business A",
            is_active: false,
          },
        ],
      }),
    });

    const rendered = render(<CustomersPage />);
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(await screen.findAllByText("Archived Business A")).not.toHaveLength(
      0,
    );

    mocks.businessId = "business-b";
    mocks.canManageCustomers = false;
    rendered.rerender(<CustomersPage />);

    await waitFor(() => {
      expect(screen.queryAllByText("Archived Business A")).toHaveLength(0);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});
