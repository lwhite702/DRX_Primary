import { describe, expect, it } from "vitest";
import {
  convertUnit,
  convertVolume,
  convertWeight,
  formatQuantity,
  fromCanonical,
  fromGrams,
  fromMl,
  gramFactorForUnit,
  isDimensionless,
  isVolumeUnit,
  isWeightUnit,
  toCanonical,
  toGrams,
  toMl,
  unitLabel,
  unitSymbol,
} from "../convert";

const EPSILON = 0.001;
const close = (a: number, b: number) => Math.abs(a - b) < EPSILON;

// ---------------------------------------------------------------------------
// gramFactorForUnit
// ---------------------------------------------------------------------------
describe("gramFactorForUnit", () => {
  it("g → 1", () => expect(gramFactorForUnit("g")).toBe(1));
  it("oz → ~28.35", () => expect(close(gramFactorForUnit("oz"), 28.35)).toBe(true));
  it("lb → ~453.59", () => expect(close(gramFactorForUnit("lb"), 453.592)).toBe(true));
  it("kg → 1000", () => expect(gramFactorForUnit("kg")).toBe(1000));
  it("ml → 1", () => expect(gramFactorForUnit("ml")).toBe(1));
  it("L → 1000", () => expect(gramFactorForUnit("L")).toBe(1000));
  it("fl_oz → ~29.57", () => expect(close(gramFactorForUnit("fl_oz"), 29.5735)).toBe(true));
  it("unit → 1", () => expect(gramFactorForUnit("unit")).toBe(1));
  it("each → 1", () => expect(gramFactorForUnit("each")).toBe(1));
});

// ---------------------------------------------------------------------------
// Dimension guards
// ---------------------------------------------------------------------------
describe("dimension guards", () => {
  it("isWeightUnit g", () => expect(isWeightUnit("g")).toBe(true));
  it("isWeightUnit oz", () => expect(isWeightUnit("oz")).toBe(true));
  it("isWeightUnit ml", () => expect(isWeightUnit("ml")).toBe(false));
  it("isWeightUnit unit", () => expect(isWeightUnit("unit")).toBe(false));
  it("isVolumeUnit L", () => expect(isVolumeUnit("L")).toBe(true));
  it("isVolumeUnit g", () => expect(isVolumeUnit("g")).toBe(false));
  it("isDimensionless unit", () => expect(isDimensionless("unit")).toBe(true));
  it("isDimensionless each", () => expect(isDimensionless("each")).toBe(true));
  it("isDimensionless g", () => expect(isDimensionless("g")).toBe(false));
});

// ---------------------------------------------------------------------------
// Weight conversions
// ---------------------------------------------------------------------------
describe("toGrams / fromGrams", () => {
  it("1 oz → grams", () => expect(close(toGrams(1, "oz"), 28.35)).toBe(true));
  it("1 lb → grams", () => expect(close(toGrams(1, "lb"), 453.592)).toBe(true));
  it("1 kg → grams", () => expect(toGrams(1, "kg")).toBe(1000));
  it("1 g → grams (identity)", () => expect(toGrams(1, "g")).toBe(1));

  it("28.35 g → ~1 oz", () => expect(close(fromGrams(28.3495, "oz"), 1)).toBe(true));
  it("453.59 g → ~1 lb", () => expect(close(fromGrams(453.592, "lb"), 1)).toBe(true));
  it("1000 g → 1 kg", () => expect(fromGrams(1000, "kg")).toBe(1));

  it("round-trip oz", () => {
    const val = 3.5;
    expect(close(fromGrams(toGrams(val, "oz"), "oz"), val)).toBe(true);
  });
  it("round-trip lb", () => {
    const val = 0.25;
    expect(close(fromGrams(toGrams(val, "lb"), "lb"), val)).toBe(true);
  });
});

describe("convertWeight", () => {
  it("oz → lb", () => expect(close(convertWeight(16, "oz", "lb"), 1)).toBe(true));
  it("lb → oz", () => expect(close(convertWeight(1, "lb", "oz"), 16)).toBe(true));
  it("kg → g", () => expect(convertWeight(1, "kg", "g")).toBe(1000));
  it("same unit → identity", () => expect(convertWeight(7, "g", "g")).toBe(7));
});

// ---------------------------------------------------------------------------
// Volume conversions
// ---------------------------------------------------------------------------
describe("toMl / fromMl", () => {
  it("1 L → 1000 ml", () => expect(toMl(1, "L")).toBe(1000));
  it("1 fl_oz → ~29.57 ml", () => expect(close(toMl(1, "fl_oz"), 29.5735)).toBe(true));
  it("1 ml → ml (identity)", () => expect(toMl(1, "ml")).toBe(1));

  it("1000 ml → 1 L", () => expect(fromMl(1000, "L")).toBe(1));
  it("round-trip fl_oz", () => {
    const val = 12;
    expect(close(fromMl(toMl(val, "fl_oz"), "fl_oz"), val)).toBe(true);
  });
});

describe("convertVolume", () => {
  it("L → ml", () => expect(convertVolume(2, "L", "ml")).toBe(2000));
  it("ml → L", () => expect(convertVolume(500, "ml", "L")).toBe(0.5));
  it("same unit → identity", () => expect(convertVolume(5, "ml", "ml")).toBe(5));
});

// ---------------------------------------------------------------------------
// convertUnit (generic)
// ---------------------------------------------------------------------------
describe("convertUnit", () => {
  it("weight → weight", () => expect(close(convertUnit(1, "oz", "g"), 28.35)).toBe(true));
  it("volume → volume", () => expect(convertUnit(1, "L", "ml")).toBe(1000));
  it("dimensionless → anything → passthrough", () => {
    expect(convertUnit(5, "unit", "g")).toBe(5);
    expect(convertUnit(5, "g", "each")).toBe(5);
  });
  it("weight → volume throws", () => {
    expect(() => convertUnit(1, "g", "ml")).toThrow();
  });
  it("volume → weight throws", () => {
    expect(() => convertUnit(1, "L", "oz")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// toCanonical / fromCanonical
// ---------------------------------------------------------------------------
describe("toCanonical / fromCanonical", () => {
  it("oz → grams", () => expect(close(toCanonical(1, "oz"), 28.35)).toBe(true));
  it("L → ml", () => expect(toCanonical(2, "L")).toBe(2000));
  it("unit → passthrough", () => expect(toCanonical(100, "unit")).toBe(100));
  it("each → passthrough", () => expect(toCanonical(50, "each")).toBe(50));

  it("grams → oz", () => expect(close(fromCanonical(28.3495, "oz"), 1)).toBe(true));
  it("ml → L", () => expect(fromCanonical(1000, "L")).toBe(1));
  it("count → passthrough", () => expect(fromCanonical(100, "unit")).toBe(100));

  it("round-trip oz", () => {
    const val = 3.5;
    expect(close(fromCanonical(toCanonical(val, "oz"), "oz"), val)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
describe("unitLabel", () => {
  it("oz singular", () => expect(unitLabel("oz")).toBe("ounce"));
  it("oz plural", () => expect(unitLabel("oz", true)).toBe("ounces"));
  it("lb plural", () => expect(unitLabel("lb", true)).toBe("pounds"));
  it("unit", () => expect(unitLabel("unit")).toBe("unit"));
  it("unit plural", () => expect(unitLabel("unit", true)).toBe("units"));
  it("fl_oz", () => expect(unitLabel("fl_oz")).toBe("fl oz"));
});

describe("unitSymbol", () => {
  it("g", () => expect(unitSymbol("g")).toBe("g"));
  it("oz", () => expect(unitSymbol("oz")).toBe("oz"));
  it("fl_oz", () => expect(unitSymbol("fl_oz")).toBe("fl oz"));
  it("unit", () => expect(unitSymbol("unit")).toBe("unit"));
});

describe("formatQuantity", () => {
  it("formats with unit symbol", () => expect(formatQuantity(1, "oz")).toBe("1 oz"));
  it("formats with precision", () => expect(formatQuantity(0.125, "oz")).toBe("0.125 oz"));
  it("rounds to specified decimal places", () => expect(formatQuantity(28.3495, "g", 0)).toBe("28 g"));
  it("trims trailing zeros", () => expect(formatQuantity(3.5, "oz")).toBe("3.5 oz"));
  it("dimensionless defaults to 0 decimal places", () => expect(formatQuantity(100, "unit")).toBe("100 unit"));
});
