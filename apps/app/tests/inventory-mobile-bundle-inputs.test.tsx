import React, { useState, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FractionalProductFields } from "../../mobile/src/components/fractional-product-fields";
import type { ProductCommerceConfig } from "../lib/commerce/config";
import { canonicalCreationCommerce, guidedCommerceProfile } from "../lib/commerce/product-creation";

// Exercise the mobile component's controlled state with DOM equivalents of the
// native primitives. TextInput forwards the complete text after each keystroke.
// Resolve the native package from the mobile workspace, where it is installed.
vi.mock("../../mobile/src/components/MotionTouchableOpacity", () => ({
  default: ({ children, onPress, accessibilityLabel, disabled }: {
    children?: ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
  }) => <button aria-label={accessibilityLabel} onClick={onPress} disabled={disabled}>{children}</button>,
}));

vi.mock("../../mobile/node_modules/react-native/index.js", () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  TextInput: ({ value, defaultValue, onChangeText, accessibilityLabel }: {
    value?: string;
    defaultValue?: string;
    onChangeText: (text: string) => void;
    accessibilityLabel: string;
  }) => <input aria-label={accessibilityLabel} value={value} defaultValue={defaultValue}
    onChange={event => onChangeText(event.target.value)} />,
  Switch: ({ value, onValueChange, accessibilityLabel }: {
    value: boolean;
    onValueChange: (value: boolean) => void;
    accessibilityLabel: string;
  }) => <input type="checkbox" aria-label={accessibilityLabel} checked={value}
    onChange={event => onValueChange(event.target.checked)} />,
  TouchableOpacity: ({ children, onPress, accessibilityLabel, disabled }: {
    children?: ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
  }) => <button aria-label={accessibilityLabel} onClick={onPress} disabled={disabled}>{children}</button>,
  Platform: {
    OS: "web",
    select: (options: Record<string, unknown>) => options.web ?? options.default,
  },
}));

afterEach(cleanup);

function ControlledProduct({ onChange }: { onChange: (config: ProductCommerceConfig) => void }) {
  const [config, setConfig] = useState<ProductCommerceConfig>({
    ...guidedCommerceProfile("g", true),
    bulkPriceTiers: [{ id: "bundle-1", label: "2+", minimumQuantity: 2, unitPrice: 30, totalPrice: 60 }],
  });
  return <FractionalProductFields value={config} basePrice={35} onChange={next => {
    setConfig(next);
    onChange(next);
  }} />;
}

describe("mobile bundle decimal entry (WRE-214)", () => {
  it.each([
    { quantity: "3.5", total: "90.25", expectedCents: 9025 },
    { quantity: "0.5", total: "0.50", expectedCents: 50 },
  ])("preserves each keystroke for $quantity g with total $total", async ({ quantity, total, expectedCents }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledProduct onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Advanced: bulk and bundle prices" }));

    for (const [label, text] of [
      ["Bundle 1 quantity", quantity],
      ["Bundle 1 total price", total],
    ]) {
      const input = screen.getByRole("textbox", { name: label });
      await user.clear(input);
      let draft = "";
      for (const character of text) {
        draft += character;
        await user.type(input, character);
        expect(input).toHaveValue(draft);
      }
    }

    const config = onChange.mock.lastCall![0];
    expect(config.bulkPriceTiers[0]).toMatchObject({ minimumQuantity: Number(quantity), totalPrice: Number(total) });
    expect(canonicalCreationCommerce(config).bulkPriceTiers[0]).toMatchObject({
      minimumQuantity: Number(quantity), bundlePriceCents: expectedCents,
    });
  });
});
