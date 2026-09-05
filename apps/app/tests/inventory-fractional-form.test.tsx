import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  beforeAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { InventoryForm } from "../app/(app)/inventory/_components/InventoryForm";
vi.mock("@/components/ui/help-tooltip", () => ({ HelpTooltip: () => null }));
afterEach(cleanup);
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
const businessId = "11111111-1111-4111-8111-111111111111";
const initialData = {
  business_id: businessId,
  sku: "NEW",
  product_name: "Synthetic",
  quantity_on_hand: 0,
  reorder_level: 10,
  unit_of_measure: "g" as const,
  selling_price: 10,
  unit_cost: 3,
};

describe("new product selling rules", () => {
  it("includes fractional rules in the guided first-product flow even with a generated SKU", async () => {
    const save = vi.fn();
    render(
      <InventoryForm
        initialData={initialData}
        businessId={businessId}
        isFirstProduct
        onSuccess={save}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await screen.findByText("Step 2 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    await screen.findByText("Step 3 of 3");
    fireEvent.click(
      screen.getByRole("switch", { name: "Allow fractional sales" }),
    );
    fireEvent.change(screen.getByLabelText("Minimum sale quantity"), {
      target: { value: "0.5" },
    });
    fireEvent.change(screen.getByLabelText("Quantity increment"), {
      target: { value: "0.25" },
    });
    fireEvent.change(screen.getByLabelText("Suggested dollar amounts"), {
      target: { value: "10, 20" },
    });
    fireEvent.change(screen.getByLabelText("Suggested quantities"), {
      target: { value: "0.5, 0.75, 1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create First Product" }),
    );
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0].commerce_config).toMatchObject({
      fractionalEnabled: true,
      minimumSaleQuantity: 0.5,
      quantityIncrement: 0.25,
      suggestedDollarAmounts: [10, 20],
      suggestedQuantities: [0.5, 0.75, 1],
    });
  });
  it("blocks malformed presets and can return to whole-unit selling", async () => {
    const save = vi.fn();
    render(
      <InventoryForm
        initialData={initialData}
        businessId={businessId}
        onSuccess={save}
        onCancel={() => {}}
      />,
    );
    const toggle = screen.getByRole("switch", {
      name: "Allow fractional sales",
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText("Suggested quantities"), {
      target: { value: "0.5, bad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Product" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Add Product" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0].commerce_config).toMatchObject({
      fractionalEnabled: false,
      decimalPrecision: 0,
      quantityIncrement: 1,
      suggestedQuantities: [],
    });
  });
  it("does not reset selling rules while editing an existing product", () => {
    render(
      <InventoryForm
        initialData={{ ...initialData, id: businessId }}
        businessId={businessId}
        onSuccess={vi.fn()}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByRole("switch", { name: "Allow fractional sales" }),
    ).not.toBeInTheDocument();
  });
});
