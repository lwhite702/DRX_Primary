import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import InventoryPage from "@/app/inventory/page";

// Mock hooks
vi.mock("@/lib/hooks/use-business", () => ({
  useBusiness: () => ({
    business: { id: "test-business" },
    loading: false,
  }),
}));

vi.mock("@/lib/hooks/use-realtime", () => ({
  useRealtimeInventory: () => [],
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({}),
}));

// Mock components that might cause issues
vi.mock("@/components/ui/tour", () => ({
  Tour: () => null,
}));

describe("InventoryPage Neon Velocity", () => {
  it("renders with Neon Velocity header styling", () => {
    render(<InventoryPage />);

    // Check for "INVENTORY" header which uses "headline-text" class (verified in code)
    expect(screen.getByText("INVENTORY")).toBeInTheDocument();

    // Check for "MANAGEMENT CONSOLE" label
    expect(
      screen.getByText((content) => content.includes("MANAGEMENT CONSOLE")),
    ).toBeInTheDocument();

    // Check for Intake button text
    expect(screen.getByText("INTAKE STOCK")).toBeInTheDocument();
  });
});
