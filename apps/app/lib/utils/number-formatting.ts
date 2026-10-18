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

const SAFE_ALPHANUMERIC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generates a human-friendly order number with ORD- prefix and 6 random safe base32 alphanumeric chars (e.g. ORD-489201).
 */
export function generateSafeOrderNumber(): string {
  let result = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * SAFE_ALPHANUMERIC.length);
    result += SAFE_ALPHANUMERIC[idx];
  }
  return `ORD-${result}`;
}

/**
 * Formats order numbers safely for humans:
 * - If it has a long UUID or raw timestamp suffix (e.g. ORD-69397A70-E49C-..., ORD-1728445123), shortens to 6-char safe suffix.
 * - Otherwise preserves concise order numbers as-is.
 */
export function safeDisplayOrderNumber(orderNumber: string | null | undefined): string {
  if (!orderNumber) return "";
  const trimmed = String(orderNumber).trim();
  if (!trimmed) return "";

  // Already safe 6-char: ORD-XXXXXX
  if (/^ORD-[0-9A-Za-z]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Prefixed UUID or long token: ORD-69397A70-..., WEB-69397A70-..., POS-..., OFF-..., DRX-A-...
  const prefixMatch = /^(?:ORD|WEB|POS|OFF|DRX-A)-([0-9A-Za-z-]{8,})$/i.exec(trimmed);
  if (prefixMatch) {
    const rawSuffix = prefixMatch[1]!;
    // Pure numeric timestamp suffix: take last 6 digits
    if (/^\d{10,13}$/.test(rawSuffix)) {
      return `ORD-${rawSuffix.slice(-6)}`;
    }
    const stripped = rawSuffix.replace(/-/g, "");
    if (stripped.length >= 6) {
      return `ORD-${stripped.slice(0, 6).toUpperCase()}`;
    }
  }

  // Raw UUID without prefix: 69397A70-...
  if (/^[0-9A-Fa-f]{6}[0-9A-Fa-f-]{26,}$/.test(trimmed)) {
    const stripped = trimmed.replace(/-/g, "");
    return `ORD-${stripped.slice(0, 6).toUpperCase()}`;
  }

  // Raw Convex ID or long alphanumeric token (>= 20 chars without spaces)
  if (/^[0-9A-Za-z]{20,}$/.test(trimmed)) {
    return `ORD-${trimmed.slice(-6).toUpperCase()}`;
  }

  return trimmed;
}

