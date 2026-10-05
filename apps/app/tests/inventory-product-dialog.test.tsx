import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InventoryPage from "@/app/(app)/inventory/page";

vi.mock("@/components/ui/tour", () => ({ Tour: () => null }));
vi.mock("@/components/ui/help-tooltip", () => ({ HelpTooltip: () => null }));

const existingProduct = {
  id: "22222222-2222-4222-8222-222222222222",
  sku: "SYNTHETIC-1",
  productName: "Synthetic product",
  quantityOnHand: 12,
  reorderLevel: 3,
  baseUnit: "g",
  unitCost: "3.00",
  sellingPrice: "10.00",
};

beforeEach(() => {
  window.history.replaceState({}, "", "/inventory");
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({ data: [existingProduct] }))),
  ));
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("inventory product dialog", () => {
  it("labels an automatic-SKU setup draft as creation, not editing", async () => {
    window.history.replaceState({}, "", "/inventory?create=1");
    render(<InventoryPage />);
    await screen.findByRole("dialog");
    expect(screen.getByText("DRX will create a unique SKU when you save.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Add product");
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Add a product to your stock.");
    expect(screen.getByRole("switch", { name: "Sell by weight or fractional amounts" })).toBeInTheDocument();
  });

  it("retains edit copy and values for a persisted product", async () => {
    render(<InventoryPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Synthetic product/ }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Edit product");
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Change the product details.");
    expect(screen.getByDisplayValue("SYNTHETIC-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Product" })).toBeInTheDocument();
  });

  it("contains the expanded form in a scrollable viewport with a separate header", async () => {
    window.history.replaceState({}, "", "/inventory?create=1");
    render(<InventoryPage />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("switch", { name: "Sell by weight or fractional amounts" }));
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]", "overflow-hidden", "flex", "flex-col");
    const form = screen.getByLabelText("Minimum sale amount").closest("form")!;
    expect(form.parentElement).toHaveClass("min-h-0", "overflow-y-auto");
    expect(form.parentElement).not.toContainElement(screen.getByRole("button", { name: "Close" }));
    expect(form.parentElement).not.toContainElement(screen.getByRole("heading", { level: 2 }));
  });

  it("labels the guided first-product creation from the empty inventory action", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ data: [] })));
    render(<InventoryPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Add product" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Add product");
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it.each(["Cancel", "Close", "Escape"])("dismisses expanded creation with %s without reopening from the setup link", async (action) => {
    window.history.replaceState({}, "", "/inventory?create=1");
    const { rerender } = render(<InventoryPage />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("switch", { name: "Sell by weight or fractional amounts" }));
    expect(screen.getByLabelText("Minimum sale amount")).toBeInTheDocument();
    if (action === "Escape") {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    } else {
      fireEvent.click(screen.getByRole("button", { name: action }));
    }
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerender(<InventoryPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
});
