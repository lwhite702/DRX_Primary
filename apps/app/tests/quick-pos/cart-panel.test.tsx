import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CartPanel } from "@/components/quick-pos/cart-panel";
import type { QuickPosCartItem } from "@/lib/quick-pos/types";

describe("CartPanel", () => {
  const sampleItems: QuickPosCartItem[] = [
    {
      id: "inv:item-1",
      inventoryId: "item-1",
      name: "Blue Dream",
      unitPrice: 15,
      qty: 2,
      source: "inventory",
    },
    {
      id: "inv:item-2",
      inventoryId: "item-2",
      name: "Sour Diesel",
      unitPrice: 20,
      qty: 1,
      source: "inventory",
    },
  ];

  it("renders cart items and totals correctly", () => {
    render(
      <CartPanel
        items={sampleItems}
        onTap={vi.fn()}
        onLongPressRemove={vi.fn()}
        subtotal={50}
        total={50}
      />,
    );

    expect(screen.getByText("Cart")).toBeInTheDocument();
    expect(screen.getByText(/Blue Dream/)).toBeInTheDocument();
    expect(screen.getByText(/Sour Diesel/)).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.getAllByText("$50.00")).toHaveLength(2); // Subtotal and Total
  });

  it("calls onRemove when the trash remove button is clicked", () => {
    const onRemove = vi.fn();
    const onLongPressRemove = vi.fn();

    render(
      <CartPanel
        items={sampleItems}
        onTap={vi.fn()}
        onLongPressRemove={onLongPressRemove}
        onRemove={onRemove}
        subtotal={50}
        total={50}
      />,
    );

    const removeBlueDream = screen.getByRole("button", {
      name: "Remove Blue Dream from cart",
    });
    fireEvent.click(removeBlueDream);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("inv:item-1");
    expect(onLongPressRemove).not.toHaveBeenCalled();
  });

  it("renders Clear button and calls onClear when clicked", () => {
    const onClear = vi.fn();

    render(
      <CartPanel
        items={sampleItems}
        onTap={vi.fn()}
        onLongPressRemove={vi.fn()}
        onClear={onClear}
        subtotal={50}
        total={50}
      />,
    );

    const clearButton = screen.getByRole("button", { name: "Clear cart" });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onTap when item row is clicked or activated with keyboard", () => {
    const onTap = vi.fn();

    render(
      <CartPanel
        items={sampleItems}
        onTap={onTap}
        onLongPressRemove={vi.fn()}
        subtotal={50}
        total={50}
      />,
    );

    const itemRow = screen.getByRole("button", { name: "Increment Blue Dream" });
    fireEvent.keyDown(itemRow, { key: "Enter", code: "Enter" });

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith("inv:item-1");
  });
});
