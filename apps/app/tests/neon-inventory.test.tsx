import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import InventoryPage from "@/app/inventory/menu/page";

// Mock hooks
vi.mock("@/lib/hooks/use-business", () => ({
  useBusiness: () => ({
    business: { id: "test-business" },
    loading: false,
  }),
}));

vi.mock("@/lib/hooks/use-realtime", () => ({
  useRealtimeInventory: () => ({
    inventory: [],
    loading: false,
    refreshing: false,
    error: null,
    syncStatus: "snapshot",
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/data/client/supabase-client", () => ({
  createAppClient: () => ({}),
}));

// Mock components that might cause issues
vi.mock("@/components/ui/tour", () => ({
  Tour: () => null,
}));

describe("InventoryPage Neon Velocity", () => {
  it("renders with Neon Velocity header styling", () => {
    render(<InventoryPage />);

    // Check for the plain-language Products menu item which uses neon styling
    expect(screen.getByText("PRODUCTS")).toBeInTheDocument();

    // Check for Add stock button text
    expect(screen.getByText("ADD STOCK")).toBeInTheDocument();

    // Check for New sale menu item
    expect(screen.getByText("NEW SALE")).toBeInTheDocument();

    // Check for Payments menu item
    expect(screen.getByText("PAYMENTS")).toBeInTheDocument();
  });
});
