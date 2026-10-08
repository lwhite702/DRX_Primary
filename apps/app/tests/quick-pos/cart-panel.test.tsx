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

  it("renders override badge when item has originalPrice and overrideReason", () => {
    const overriddenItems: QuickPosCartItem[] = [
      {
        ...sampleItems[0],
        unitPrice: 12,
        originalPrice: 15,
        overrideReason: "Loyalty concession",
      },
    ];

    render(
      <CartPanel
        items={overriddenItems}
        onTap={vi.fn()}
        onLongPressRemove={vi.fn()}
        subtotal={24}
        total={24}
      />,
    );

    expect(screen.getByText(/Override \(was \$30\.00\)/)).toBeInTheDocument();
  });

  it("opens price override modal and submits price update", () => {
    const onUpdatePrice = vi.fn();

    render(
      <CartPanel
        items={sampleItems}
        onTap={vi.fn()}
        onLongPressRemove={vi.fn()}
        onUpdatePrice={onUpdatePrice}
        subtotal={50}
        total={50}
      />,
    );

    const overrideButton = screen.getByRole("button", {
      name: "Override price for Blue Dream",
    });
    fireEvent.click(overrideButton);

    expect(screen.getByText("Override Price")).toBeInTheDocument();

    const priceInput = screen.getByLabelText(/New Price/);
    fireEvent.change(priceInput, { target: { value: "12" } });

    const reasonInput = screen.getByLabelText(/Reason/);
    fireEvent.change(reasonInput, { target: { value: "Special promotional rate" } });

    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);

    expect(onUpdatePrice).toHaveBeenCalledTimes(1);
    expect(onUpdatePrice).toHaveBeenCalledWith("inv:item-1", 12, "Special promotional rate");
  });
});
