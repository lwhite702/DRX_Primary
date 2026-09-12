import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { ProgressiveSection } from "@/components/ui/progressive-section";
import { InventoryForm } from "@/app/(app)/inventory/_components/InventoryForm";

vi.mock("@/components/ui/help-tooltip", () => ({ HelpTooltip: () => null }));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(cleanup);

describe("ProgressiveSection Component", () => {
  it("renders collapsed by default with a clear reveal toggle", () => {
    render(
      <ProgressiveSection title="Advanced options" description="Optional config" defaultOpen={false}>
        <div data-testid="hidden-content">Advanced details inside</div>
      </ProgressiveSection>
    );

    const trigger = screen.getByRole("button", { name: /Advanced options/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Show details")).toBeInTheDocument();

    // Toggle open
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hide details")).toBeInTheDocument();
    expect(screen.getByTestId("hidden-content")).toBeInTheDocument();
  });
});

describe("Progressive Disclosure in Inventory Form", () => {
  const businessId = "11111111-1111-4111-8111-111111111111";

  it("exposes primary fields immediately while keeping additional schema behind progressive reveal", () => {
    render(
      <InventoryForm
        businessId={businessId}
        onSuccess={vi.fn()}
        onCancel={() => {}}
      />
    );

    // Primary essential fields are immediately visible in the primary section
    expect(screen.getByText("Primary Details")).toBeInTheDocument();
    expect(screen.getByLabelText(/Product Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Selling Retail Price \(\$\) \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Acquisition Unit Cost \(\$\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Stock/i)).toBeInTheDocument();

    // Progressive reveal trigger is present
    const progressiveTrigger = screen.getByRole("button", {
      name: /Additional Details & Advanced Rules/i,
    });
    expect(progressiveTrigger).toBeInTheDocument();
    expect(progressiveTrigger).toHaveAttribute("aria-expanded", "false");

    // Click to expand additional details
    fireEvent.click(progressiveTrigger);
    expect(progressiveTrigger).toHaveAttribute("aria-expanded", "true");

    // Additional fields are now revealed
    expect(screen.getByLabelText(/Storage Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reorder Alert Threshold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject to sales tax/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description \/ Strain Notes/i)).toBeInTheDocument();
  });
});
