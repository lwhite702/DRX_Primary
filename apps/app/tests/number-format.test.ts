import { expect, it } from "vitest";
import { formatAmount, formatQuantity, formatPercentage, formatCount } from "../lib/number-format";
it("shows money and quantities with exactly two decimals without mutating values", () => {
  expect(formatAmount(12)).toBe("12.00");
  expect(formatAmount(1.005)).toBe("1.01");
  const quantity = 0.125;
  expect(formatQuantity(quantity)).toBe("0.13");
  expect(quantity).toBe(0.125);
});
it("shows percentages and other counts with one decimal", () => {
  expect(formatPercentage(8.25)).toBe("8.3");
  expect(formatPercentage(8)).toBe("8.0");
  expect(formatCount(12)).toBe("12.0");
});

it("normalizes rounded negative zero without hiding meaningful negative values", () => {
  expect(formatAmount(-0.001)).toBe("0.00");
  expect(formatQuantity(-0)).toBe("0.00");
  expect(formatPercentage(-0.01)).toBe("0.0");
  expect(formatCount(-0)).toBe("0.0");
  expect(formatAmount(-0.01)).toBe("-0.01");
  expect(formatPercentage(-0.1)).toBe("-0.1");
  expect(formatAmount(Number.NaN)).toBe("—");
  expect(formatCount(Infinity)).toBe("—");
});
