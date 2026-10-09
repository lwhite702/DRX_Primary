import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepperInput } from "@/components/ui/stepper-input";

describe("StepperInput", () => {
  it("allows backspacing completely to empty without reverting to 0", () => {
    const onChange = vi.fn();
    render(
      <StepperInput
        id="test-stepper"
        value={10}
        onChange={onChange}
        min={0}
        max={100}
        aria-label="Test Stepper"
      />
    );

    const input = screen.getByLabelText("Test Stepper") as HTMLInputElement;
    expect(input.value).toBe("10");

    // Backspace to empty
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    // Typing '5' directly works without requiring '05'
    fireEvent.change(input, { target: { value: "5" } });
    expect(input.value).toBe("5");
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("handles stepper increase and decrease correctly", () => {
    const onChange = vi.fn();
    render(
      <StepperInput
        id="test-stepper-2"
        value={5}
        onChange={onChange}
        min={0}
        step={1}
        aria-label="Stepper"
      />
    );

    const increaseBtn = screen.getByRole("button", { name: "Increase Stepper" });
    fireEvent.click(increaseBtn);
    expect(onChange).toHaveBeenLastCalledWith(6);

    const decreaseBtn = screen.getByRole("button", { name: "Decrease Stepper" });
    fireEvent.click(decreaseBtn);
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it("reverts to min on blur if left blank", () => {
    const onChange = vi.fn();
    render(
      <StepperInput
        id="test-stepper-3"
        value={10}
        onChange={onChange}
        min={1}
        aria-label="Stepper Blank"
      />
    );

    const input = screen.getByLabelText("Stepper Blank") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.blur(input);
    expect(input.value).toBe("1");
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
