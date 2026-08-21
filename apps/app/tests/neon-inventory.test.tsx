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

    // Check for "INVENTORY" menu item which uses neon styling
    expect(screen.getByText("INVENTORY")).toBeInTheDocument();

    // Check for Intake button text
    expect(screen.getByText("INTAKE")).toBeInTheDocument();

    // Check for POS menu item
    expect(screen.getByText("POS")).toBeInTheDocument();

    // Check for Credit menu item
    expect(screen.getByText("CREDIT")).toBeInTheDocument();
  });
});
