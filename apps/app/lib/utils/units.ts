/**
 * Helper functions for unit of measure
 */

export type UnitOfMeasure = "g" | "oz" | "lb" | "L" | "ml";

const LIQUID_CATEGORIES = [
  "beverage",
  "liquid",
  "drink",
  "syrup",
  "oil",
  "tincture",
  "concentrate",
];

/**
 * Determine unit of measure based on product category
 * @param category - Product category name
 * @returns "oz" for liquid categories, "g" for everything else
 */
export function getUnitForCategory(category?: string | null): UnitOfMeasure {
  if (!category) return "g";

  const normalizedCategory = category.toLowerCase().trim();
  return LIQUID_CATEGORIES.includes(normalizedCategory) ? "oz" : "g";
}

/**
 * Get display label for unit of measure
 */
export function getUnitLabel(unit: UnitOfMeasure, plural = false): string {
  switch (unit) {
    case "oz":
      return plural ? "ounces" : "ounce";
    case "lb":
      return plural ? "pounds" : "pound";
    case "L":
      return plural ? "liters" : "liter";
    case "ml":
      return plural ? "milliliters" : "milliliter";
    default:
      return plural ? "grams" : "gram";
  }
}

/**
 * Get short label for unit of measure
 */
export function getUnitShortLabel(unit: UnitOfMeasure): string {
  return unit;
}
