/**
 * Resilient number and currency parsing & formatting utilities.
 * Accepts user-entered strings with currency symbols ($), thousand separators (,),
 * units (g, oz, etc.), or European comma decimals and coerces them into clean numbers.
 */

export function parseCurrency(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isNegative = trimmed.startsWith("-");
  let cleaned = trimmed.replace(/[^0-9.,]/g, "");
  if (!cleaned) return undefined;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastPeriod = cleaned.lastIndexOf(".");
    if (lastComma > lastPeriod) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return undefined;

  return isNegative ? -Math.abs(parsed) : parsed;
}

export function formatCurrencyInput(value: unknown): string {
  const parsed = parseCurrency(value);
  if (parsed === undefined) return "";
  return parsed.toFixed(2);
}

export function parseDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isNegative = trimmed.startsWith("-");
  let cleaned = trimmed.replace(/[^0-9.,]/g, "");
  if (!cleaned) return undefined;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastPeriod = cleaned.lastIndexOf(".");
    if (lastComma > lastPeriod) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 3) {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return undefined;

  return isNegative ? -Math.abs(parsed) : parsed;
}
