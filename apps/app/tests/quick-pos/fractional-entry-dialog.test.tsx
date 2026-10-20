import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FractionalEntryDialog } from "@/components/quick-pos/fractional-entry-dialog";
import type { QuickPosBootstrapItem, QuickPosCartItem } from "@/lib/quick-pos/types";

const product = {
  id: "product-1",
  name: "Fractional product",
  sku: "FRAC-1",
  barcode: null,
  commerce_config: {
    fractionalEnabled: true,
    sellingUnit: "g",
    decimalPrecision: 1,
    minimumSaleQuantity: 0.1,
    quantityIncrement: 0.1,
    baseUnitPrice: 35,
    suggestedDollarAmounts: [],
    suggestedQuantities: [],
    bulkPriceTiers: [],
  },
} as unknown as QuickPosBootstrapItem;

describe("fractional dollar entry", () => {
  it("lets the operator edit the suggested quantity and confirms the exact requested cents", () => {
    const onAdd = vi.fn<(item: QuickPosCartItem) => void>();
    render(<FractionalEntryDialog product={product} onClose={vi.fn()} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText("Dollar amount"), { target: { value: "25" } });
    const quantity = screen.getByLabelText("Confirmed quantity (g)");
    expect(quantity).toHaveValue(0.7);
    fireEvent.change(quantity, { target: { value: "0" } });
    expect(screen.getByLabelText("Confirmed quantity (g)")).toBeInTheDocument();
    fireEvent.change(quantity, { target: { value: "0.6" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Difference from pre-loyalty normal price: $21.00 at this quantity, +$4.00. Checkout will keep the requested amount; its recorded adjustment reflects applied discounts.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm amount and quantity" }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      requestedAmountCents: 2_500,
      weightGrams: 0.6,
      unitPrice: 25,
      qty: 1,
    }));
  });
});
