import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { InventoryForm } from "../app/(app)/inventory/_components/InventoryForm";

vi.mock("@/components/ui/help-tooltip", () => ({ HelpTooltip: () => null }));
afterEach(cleanup);
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterAll(() => vi.unstubAllGlobals());

const businessId = "11111111-1111-4111-8111-111111111111";
const initialData = {
  business_id: businessId, sku: "NEW", product_name: "Synthetic",
  quantity_on_hand: 0, reorder_level: 10, unit_of_measure: "g" as const,
  selling_price: 35, unit_cost: 3,
};

describe("guided product setup", () => {
  it("saves a generated SKU choice with valid recommended fractional rules", async () => {
    const save = vi.fn();
    render(<InventoryForm initialData={initialData} businessId={businessId} isFirstProduct onSuccess={save} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate SKU" }));
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await screen.findByText("Step 2 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await screen.findByText("Step 3 of 3");
    fireEvent.click(screen.getByRole("switch", { name: "Sell by weight or fractional amounts" }));
    fireEvent.click(screen.getByRole("button", { name: "Create First Product" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0]).toMatchObject({
      sku: "", commerce_config: {
        fractionalEnabled: true, minimumSaleQuantity: 0.5,
        quantityIncrement: 0.5, suggestedQuantities: [0.5, 1, 3.5, 7, 14, 28],
      },
    });
  });

  it("shows a reset path when custom selling rules conflict", async () => {
    render(<InventoryForm initialData={initialData} businessId={businessId} onSuccess={vi.fn()} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Additional Details & Advanced Rules/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Sell by weight or fractional amounts" }));
    fireEvent.click(screen.getByText("Custom selling rules"));
    fireEvent.change(screen.getByLabelText("Minimum sale amount"), { target: { value: "0.3" } });
    expect(screen.getAllByRole("button", { name: "Use recommended rules" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Use recommended rules" })[0]);
    await waitFor(() => expect(screen.queryByText(/A quick-tap amount must/)).not.toBeInTheDocument());
  });

  it("converts a $160 ounce purchase into cost per gram before saving", async () => {
    const save = vi.fn();
    render(<InventoryForm initialData={initialData} businessId={businessId} onSuccess={save} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("switch", { name: "I buy this in a different unit" }));
    fireEvent.change(screen.getByLabelText("Purchase price ($)"), { target: { value: "160" } });
    fireEvent.change(screen.getByLabelText("Purchase unit"), { target: { value: "oz" } });
    expect(screen.getByText(/\$5\.64 per g/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Product" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0]).toMatchObject({
      selling_price: 35,
      purchase_cost_basis: { costCents: 16000, quantity: 1, unit: "oz" },
    });
  });

  it("does not reset selling rules while editing an existing product", () => {
    render(<InventoryForm initialData={{ ...initialData, id: businessId }} businessId={businessId} onSuccess={vi.fn()} onCancel={() => {}} />);
    expect(screen.queryByRole("switch", { name: "Sell by weight or fractional amounts" })).not.toBeInTheDocument();
  });
});
