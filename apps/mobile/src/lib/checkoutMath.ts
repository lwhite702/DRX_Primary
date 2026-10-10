export type BulkPriceTier = {
  minimumQuantity: number;
  unitPriceCents: number;
  bundlePriceCents?: number;
};

export type FractionalProduct = {
  sellingPriceCents: number;
  allowFractionalWeight?: boolean;
  sellingUnit?: string;
  quantityPrecision?: number;
  minimumSaleQuantity?: number;
  quantityIncrement?: number;
  suggestedQuantityPresets?: number[];
  suggestedDollarPresetsCents?: number[];
  bulkPriceTiers?: BulkPriceTier[];
};

export type LoyaltyCombinationPolicy = "stack" | "best_only";
export type LoyaltyTier = {
  minimumSpendCents: number;
  discountRateBps: number;
};

export type LoyaltySpend = {
  totalPurchasesCents: number;
  loyaltyEligibleSpendCents?: number;
};

export const LEGACY_FRACTIONAL_QUANTITY_CONFIG = Object.freeze({
  sellingUnit: "unit",
  quantityPrecision: 6,
  minimumSaleQuantity: 0.000001,
  quantityIncrement: 0.000001,
});

export const LEGACY_WHOLE_QUANTITY_CONFIG = Object.freeze({
  sellingUnit: "unit",
  quantityPrecision: 0,
  minimumSaleQuantity: 1,
  quantityIncrement: 1,
});

const MAX_PRECISION = 6;

function legacyQuantityConfig(product: FractionalProduct) {
  return product.allowFractionalWeight
    ? LEGACY_FRACTIONAL_QUANTITY_CONFIG
    : LEGACY_WHOLE_QUANTITY_CONFIG;
}

export function quantityPrecision(product: FractionalProduct) {
  return Math.max(
    0,
    Math.min(MAX_PRECISION, product.quantityPrecision ?? legacyQuantityConfig(product).quantityPrecision),
  );
}

export function minimumSaleQuantity(product: FractionalProduct) {
  const fallback = legacyQuantityConfig(product).minimumSaleQuantity;
  const configured =
    product.minimumSaleQuantity ?? fallback;
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

export function quantityIncrement(product: FractionalProduct) {
  const fallback = legacyQuantityConfig(product).quantityIncrement;
  const configured =
    product.quantityIncrement ??
    product.minimumSaleQuantity ??
    fallback;
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

export function normalizeQuantity(
  product: FractionalProduct,
  rawQuantity: number,
  availableQuantity = Number.POSITIVE_INFINITY,
) {
  if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) return 0;
  const minimum = minimumSaleQuantity(product);
  const increment = quantityIncrement(product);
  const precision = quantityPrecision(product);
  if (availableQuantity < minimum) return 0;
  const requestedSteps = Math.max(0, Math.round((rawQuantity - minimum) / increment));
  const availableSteps = Number.isFinite(availableQuantity)
    ? Math.max(0, Math.floor(((availableQuantity - minimum) / increment) + 1e-9))
    : requestedSteps;
  const steps = Math.min(requestedSteps, availableSteps);
  return Number((minimum + steps * increment).toFixed(precision));
}

export function effectiveUnitPriceCents(
  product: FractionalProduct,
  quantity: number,
) {
  const tiers = [...(product.bulkPriceTiers ?? [])]
    .filter(
      (tier) =>
        Number.isFinite(tier.minimumQuantity) &&
        tier.minimumQuantity > 0 &&
        Number.isInteger(tier.unitPriceCents) &&
        tier.unitPriceCents >= 0,
    )
    .sort((left, right) => left.minimumQuantity - right.minimumQuantity);
  return tiers.reduce(
    (price, tier) =>
      quantity >= tier.minimumQuantity ? (tier.bundlePriceCents === undefined ? tier.unitPriceCents : tier.bundlePriceCents / tier.minimumQuantity) : price,
    product.sellingPriceCents,
  );
}

export function lineTotalCents(
  product: FractionalProduct,
  quantity: number,
) {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(quantity * effectiveUnitPriceCents(product, quantity));
}

export function resolveLoyaltyRateBps(totalPurchasesCents: number, tiers: LoyaltyTier[]) {
  return [...tiers]
    .sort((left, right) => left.minimumSpendCents - right.minimumSpendCents)
    .reduce(
      (rate, tier) =>
        totalPurchasesCents >= tier.minimumSpendCents ? tier.discountRateBps : rate,
      0,
    );
}

export function resolveLoyaltyEligibleSpendCents(customer: LoyaltySpend) {
  return customer.loyaltyEligibleSpendCents ?? customer.totalPurchasesCents;
}

export function pricedLineTotalCents(
  product: FractionalProduct,
  quantity: number,
  loyaltyRateBps: number,
  policy: LoyaltyCombinationPolicy,
) {
  const base = Math.round(quantity * product.sellingPriceCents);
  const bulk = lineTotalCents(product, quantity);
  const loyaltyOnBase = Math.round((base * loyaltyRateBps) / 10_000);
  if (policy === "stack") {
    return bulk - Math.round((bulk * loyaltyRateBps) / 10_000);
  }
  return Math.min(bulk, base - loyaltyOnBase);
}

export function suggestedQuantityForDollars(
  product: FractionalProduct,
  dollarAmountCents: number,
  availableQuantity = Number.POSITIVE_INFINITY,
  loyaltyRateBps = 0,
  policy: LoyaltyCombinationPolicy = "best_only",
) {
  if (!Number.isInteger(dollarAmountCents) || dollarAmountCents <= 0) return 0;

  // A tier can become active after conversion, so converge on the price that
  // applies to the resulting quantity. The server remains authoritative.
  let quantity = dollarAmountCents / Math.max(1, product.sellingPriceCents);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const normalized = normalizeQuantity(product, quantity, availableQuantity);
    const currentTotal = Math.max(
      1,
      pricedLineTotalCents(product, normalized, loyaltyRateBps, policy),
    );
    quantity = normalized * (dollarAmountCents / currentTotal);
  }
  return normalizeQuantity(product, quantity, availableQuantity);
}

const quantityDisplay = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function formatQuantity(product: FractionalProduct, quantity: number) {
  if (!Number.isFinite(quantity)) return "—";
  const formatted = quantityDisplay.format(quantity);
  return `${formatted === "-0.00" ? "0.00" : formatted}${product.sellingUnit ?? legacyQuantityConfig(product).sellingUnit}`;
}

const SAFE_ALPHANUMERIC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateSafeOrderNumber(): string {
  let result = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * SAFE_ALPHANUMERIC.length);
    result += SAFE_ALPHANUMERIC[idx];
  }
  return `ORD-${result}`;
}

export function safeDisplayOrderNumber(orderNumber: string | null | undefined): string {
  if (!orderNumber) return "";
  const trimmed = String(orderNumber).trim();
  if (!trimmed) return "";

  if (/^ORD-[0-9A-Za-z]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^ORD-[0-9A-Za-z]{6}[0-9A-Za-z-]{8,}$/.test(trimmed)) {
    const stripped = trimmed.replace("ORD-", "").replace(/-/g, "");
    if (stripped.length >= 6) {
      return `ORD-${stripped.slice(0, 6).toUpperCase()}`;
    }
  }

  if (/^[0-9A-Fa-f]{6}[0-9A-Fa-f-]{26,}$/.test(trimmed)) {
    const stripped = trimmed.replace(/-/g, "");
    return `ORD-${stripped.slice(0, 6).toUpperCase()}`;
  }

  const tsMatch = /^(?:ORD|DRX-A|WEB|POS|OFF)-(\d{10,13})$/.exec(trimmed);
  if (tsMatch) {
    const digits = tsMatch[1];
    return `ORD-${digits.slice(-6)}`;
  }

  return trimmed;
}

