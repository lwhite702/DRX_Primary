/**
 * DRX Unit Conversion Utility
 *
 * Canonical internal storage:
 *   - Weight → grams (quantityOnHandGrams in Convex)
 *   - Volume → milliliters (quantityOnHandGrams field, used as ml for liquid products)
 *   - Discrete → count (no conversion; gramFactor = 1, math is bypassed)
 *
 * Conversion factors are named constants — intentionally visible for compliance audits.
 * No external dependency. All math is pure floating-point; round only at the display layer.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeightUnit = "g" | "oz" | "lb" | "kg";
export type VolumeUnit = "ml" | "L" | "fl_oz";
export type DimensionlessUnit = "unit" | "each";

/** Every unit DRX supports */
export type DRXUnit = WeightUnit | VolumeUnit | DimensionlessUnit;

// ---------------------------------------------------------------------------
// Conversion factors (SI-anchored, NIST-traceable)
// ---------------------------------------------------------------------------

/** Grams per one unit of each weight measure */
export const GRAMS_PER: Record<WeightUnit, number> = {
  g: 1,
  oz: 28.3495, // International avoirdupois ounce
  lb: 453.592, // International avoirdupois pound
  kg: 1000,
};

/** Milliliters per one unit of each volume measure */
export const ML_PER: Record<VolumeUnit, number> = {
  ml: 1,
  L: 1000,
  fl_oz: 29.5735, // US fluid ounce
};

// ---------------------------------------------------------------------------
// Dimension guards
// ---------------------------------------------------------------------------

const WEIGHT_UNITS = new Set<string>(["g", "oz", "lb", "kg"]);
const VOLUME_UNITS = new Set<string>(["ml", "L", "fl_oz"]);

export function isWeightUnit(unit: DRXUnit): unit is WeightUnit {
  return WEIGHT_UNITS.has(unit);
}

export function isVolumeUnit(unit: DRXUnit): unit is VolumeUnit {
  return VOLUME_UNITS.has(unit);
}

export function isDimensionless(unit: DRXUnit): unit is DimensionlessUnit {
  return unit === "unit" || unit === "each";
}

// ---------------------------------------------------------------------------
// Gram factor — grams per one selling unit (used as the stored scale factor)
// For volume units, "grams" slot holds milliliters (water-density approximation).
// For dimensionless, factor = 1 (passthrough).
// ---------------------------------------------------------------------------

/**
 * Returns the number of canonical storage units (grams or ml) per one selling unit.
 * This is the value stored as `gramFactor` on the Convex products document.
 */
export function gramFactorForUnit(unit: DRXUnit): number {
  if (isWeightUnit(unit)) return GRAMS_PER[unit];
  if (isVolumeUnit(unit)) return ML_PER[unit];
  return 1; // dimensionless
}

// ---------------------------------------------------------------------------
// Weight conversions
// ---------------------------------------------------------------------------

/** Convert a value in the given weight unit to grams */
export function toGrams(value: number, unit: WeightUnit): number {
  return value * GRAMS_PER[unit];
}

/** Convert a gram value to the given weight unit */
export function fromGrams(grams: number, unit: WeightUnit): number {
  return grams / GRAMS_PER[unit];
}

/** Convert between any two weight units */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return (value * GRAMS_PER[from]) / GRAMS_PER[to];
}

// ---------------------------------------------------------------------------
// Volume conversions
// ---------------------------------------------------------------------------

/** Convert a value in the given volume unit to milliliters */
export function toMl(value: number, unit: VolumeUnit): number {
  return value * ML_PER[unit];
}

/** Convert a milliliter value to the given volume unit */
export function fromMl(ml: number, unit: VolumeUnit): number {
  return ml / ML_PER[unit];
}

/** Convert between any two volume units */
export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  if (from === to) return value;
  return (value * ML_PER[from]) / ML_PER[to];
}

// ---------------------------------------------------------------------------
// Generic conversion — works with any DRX unit combination
// ---------------------------------------------------------------------------

/**
 * Convert a quantity from one DRX unit to another.
 *
 * Rules:
 * - Weight ↔ Weight: allowed (g ↔ oz ↔ lb ↔ kg)
 * - Volume ↔ Volume: allowed (ml ↔ L ↔ fl_oz)
 * - Cross-dimension (weight ↔ volume): throws — use product-specific density if needed
 * - Dimensionless: returns value unchanged regardless of target unit
 */
export function convertUnit(value: number, from: DRXUnit, to: DRXUnit): number {
  if (isDimensionless(from) || isDimensionless(to)) return value;

  if (isWeightUnit(from) && isWeightUnit(to)) {
    return convertWeight(value, from, to);
  }
  if (isVolumeUnit(from) && isVolumeUnit(to)) {
    return convertVolume(value, from, to);
  }

  throw new Error(
    `Cannot convert between incompatible dimensions: "${from}" → "${to}". ` +
      `Weight and volume units require a product-specific density factor.`,
  );
}

// ---------------------------------------------------------------------------
// Canonical storage conversions (used at API / Convex boundaries)
// ---------------------------------------------------------------------------

/**
 * Convert a user-entered value (in their selling unit) to the canonical stored value.
 * For weight units → grams. For volume units → ml. For unit/each → unchanged.
 */
export function toCanonical(value: number, unit: DRXUnit): number {
  if (isWeightUnit(unit)) return toGrams(value, unit);
  if (isVolumeUnit(unit)) return toMl(value, unit);
  return value; // dimensionless: count is count
}

/**
 * Convert a canonically stored value back to the given display unit.
 * Inverse of toCanonical.
 */
export function fromCanonical(canonical: number, unit: DRXUnit): number {
  if (isWeightUnit(unit)) return fromGrams(canonical, unit);
  if (isVolumeUnit(unit)) return fromMl(canonical, unit);
  return canonical; // dimensionless
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/** Human-readable label for a unit (singular / plural) */
export function unitLabel(unit: DRXUnit, plural = false): string {
  switch (unit) {
    case "g":     return plural ? "grams" : "gram";
    case "oz":    return plural ? "ounces" : "ounce";
    case "lb":    return plural ? "pounds" : "pound";
    case "kg":    return plural ? "kilograms" : "kilogram";
    case "ml":    return plural ? "milliliters" : "milliliter";
    case "L":     return plural ? "liters" : "liter";
    case "fl_oz": return plural ? "fl oz" : "fl oz";
    case "unit":  return plural ? "units" : "unit";
    case "each":  return plural ? "each" : "each";
  }
}

/** Short symbol for a unit (for compact display) */
export function unitSymbol(unit: DRXUnit): string {
  switch (unit) {
    case "g":     return "g";
    case "oz":    return "oz";
    case "lb":    return "lb";
    case "kg":    return "kg";
    case "ml":    return "ml";
    case "L":     return "L";
    case "fl_oz": return "fl oz";
    case "unit":  return "unit";
    case "each":  return "each";
  }
}

/**
 * Format a quantity for display.
 * @example formatQuantity(0.125, "oz") → "0.125 oz"
 * @example formatQuantity(28.3495, "g", 0) → "28 g"
 */
export function formatQuantity(
  value: number,
  unit: DRXUnit,
  decimalPlaces?: number,
): string {
  const precision = decimalPlaces ?? (isDimensionless(unit) ? 0 : 3);
  // Trim trailing zeros after rounding
  const formatted = parseFloat(value.toFixed(precision)).toString();
  return `${formatted} ${unitSymbol(unit)}`;
}

// ---------------------------------------------------------------------------
// Supported unit list (for dropdowns / selects)
// ---------------------------------------------------------------------------

export const WEIGHT_UNIT_OPTIONS: Array<{ value: WeightUnit; label: string }> = [
  { value: "g",  label: "Gram (g)" },
  { value: "oz", label: "Ounce (oz)" },
  { value: "lb", label: "Pound (lb)" },
  { value: "kg", label: "Kilogram (kg)" },
];

export const VOLUME_UNIT_OPTIONS: Array<{ value: VolumeUnit; label: string }> = [
  { value: "ml",    label: "Milliliter (ml)" },
  { value: "L",     label: "Liter (L)" },
  { value: "fl_oz", label: "Fluid ounce (fl oz)" },
];

export const DIMENSIONLESS_UNIT_OPTIONS: Array<{ value: DimensionlessUnit; label: string }> = [
  { value: "unit", label: "Unit / Each" },
];

export const ALL_UNIT_OPTIONS = [
  ...WEIGHT_UNIT_OPTIONS,
  ...VOLUME_UNIT_OPTIONS,
  ...DIMENSIONLESS_UNIT_OPTIONS,
];
