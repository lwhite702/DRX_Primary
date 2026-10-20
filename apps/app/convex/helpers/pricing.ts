export type LoyaltyCombinationPolicy = "stack" | "best_only";

export interface BulkPriceTier {
  minimumQuantity: number;
  unitPriceCents: number;
  bundlePriceCents?: number;
}

export interface CommerceProduct {
  productId: string;
  productName: string;
  baseUnitPriceCents: number;
  taxable: boolean;
  allowFractional: boolean;
  quantityPrecision: number;
  minimumSaleQuantity: number;
  quantityIncrement: number;
  bulkPriceTiers: BulkPriceTier[];
}

export interface PricedLine {
  productId: string;
  productName: string;
  taxable: boolean;
  quantity: number;
  baseUnitPriceCents: number;
  appliedUnitPriceCents: number;
  baseLineTotalCents: number;
  lineSubtotalCents: number;
  bulkDiscountCents: number;
  loyaltyDiscountCents: number;
  lineDiscountCents: number;
  requestedAmountCents?: number;
  operatorPriceAdjustmentCents: number;
}

export interface CheckoutPricing {
  lines: PricedLine[];
  merchandiseSubtotalCents: number;
  taxableMerchandiseCents: number;
  discountCents: number;
  priceAdjustmentCents: number;
  merchandiseTotalCents: number;
}

export type SaleQuantityValidationReason =
  | "quantity_invalid"
  | "fractional_quantity_not_allowed"
  | "fractional_configuration_missing"
  | "quantity_configuration_invalid"
  | "quantity_precision_exceeded"
  | "quantity_below_minimum"
  | "quantity_increment_mismatch";

export type SaleQuantityValidation =
  | { valid: true; quantity: number }
  | { valid: false; reason: SaleQuantityValidationReason };

function requireSafeCents(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`INVALID_ARGUMENT: ${field} must be nonnegative integer cents`);
  }
}

function requirePrecision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 6) {
    throw new Error("INVALID_ARGUMENT: quantityPrecision must be an integer from 0 to 6");
  }
}

function roundQuantity(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function isIncrementMultiple(
  quantity: number,
  minimum: number,
  increment: number,
  precision: number,
): boolean {
  const scale = 10 ** precision;
  const scaledQuantity = Math.round(quantity * scale);
  const scaledMinimum = Math.round(minimum * scale);
  const scaledIncrement = Math.round(increment * scale);
  return (
    scaledIncrement > 0 &&
    (scaledQuantity - scaledMinimum) % scaledIncrement === 0
  );
}

export function validateSaleQuantity(input: {
  quantity: number;
  allowFractional: boolean;
  quantityPrecision?: number;
  minimumSaleQuantity?: number;
  quantityIncrement?: number;
  excessPrecisionPolicy?: "reject" | "round";
}): SaleQuantityValidation {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { valid: false, reason: "quantity_invalid" };
  }
  const fractional = !Number.isInteger(input.quantity);
  if (fractional && !input.allowFractional) {
    return { valid: false, reason: "fractional_quantity_not_allowed" };
  }
  if (
    fractional &&
    (input.quantityPrecision === undefined ||
      input.minimumSaleQuantity === undefined ||
      input.quantityIncrement === undefined)
  ) {
    return { valid: false, reason: "fractional_configuration_missing" };
  }
  const quantityPrecision = input.quantityPrecision ?? 0;
  const minimumSaleQuantity = input.minimumSaleQuantity ?? 1;
  const quantityIncrement = input.quantityIncrement ?? 1;
  if (
    !Number.isSafeInteger(quantityPrecision) ||
    quantityPrecision < 0 ||
    quantityPrecision > 6 ||
    !Number.isFinite(minimumSaleQuantity) ||
    minimumSaleQuantity <= 0 ||
    !Number.isFinite(quantityIncrement) ||
    quantityIncrement <= 0
  ) {
    return { valid: false, reason: "quantity_configuration_invalid" };
  }
  const scale = 10 ** quantityPrecision;
  const scaledQuantity = input.quantity * scale;
  if (
    Math.abs(scaledQuantity - Math.round(scaledQuantity)) > 1e-8 &&
    input.excessPrecisionPolicy !== "round"
  ) {
    return { valid: false, reason: "quantity_precision_exceeded" };
  }
  const quantity = roundQuantity(input.quantity, quantityPrecision);
  if (quantity < minimumSaleQuantity) {
    return { valid: false, reason: "quantity_below_minimum" };
  }
  if (
    !isIncrementMultiple(
      quantity,
      minimumSaleQuantity,
      quantityIncrement,
      quantityPrecision,
    )
  ) {
    return { valid: false, reason: "quantity_increment_mismatch" };
  }
  return { valid: true, quantity };
}

function quantityValidationMessage(
  productName: string,
  reason: SaleQuantityValidationReason,
): string {
  const messages: Record<SaleQuantityValidationReason, string> = {
    quantity_invalid: "quantity must be positive and finite",
    fractional_quantity_not_allowed: "requires a whole-unit quantity",
    fractional_configuration_missing:
      "is missing fractional quantity configuration",
    quantity_configuration_invalid: "has invalid quantity configuration",
    quantity_precision_exceeded: "quantity exceeds the configured precision",
    quantity_below_minimum: "is below the minimum sale quantity",
    quantity_increment_mismatch:
      "quantity must match the minimum increment",
  };
  return `INVALID_ARGUMENT: ${productName} ${messages[reason]}`;
}

function validateProduct(product: CommerceProduct): void {
  requireSafeCents(product.baseUnitPriceCents, "baseUnitPriceCents");
  requirePrecision(product.quantityPrecision);
  if (!Number.isFinite(product.minimumSaleQuantity) || product.minimumSaleQuantity <= 0) {
    throw new Error("INVALID_ARGUMENT: minimumSaleQuantity must be positive");
  }
  if (!Number.isFinite(product.quantityIncrement) || product.quantityIncrement <= 0) {
    throw new Error("INVALID_ARGUMENT: quantityIncrement must be positive");
  }
  let previousMinimum = 0;
  for (const tier of product.bulkPriceTiers) {
    if (!Number.isFinite(tier.minimumQuantity) || tier.minimumQuantity <= previousMinimum) {
      throw new Error("INVALID_ARGUMENT: Bulk tiers must use ascending, non-overlapping minimum quantities");
    }
    requireSafeCents(tier.unitPriceCents, "bulk unitPriceCents");
    if (tier.bundlePriceCents !== undefined) {
      requireSafeCents(tier.bundlePriceCents, "bundlePriceCents");
      if (tier.bundlePriceCents === 0 || tier.bundlePriceCents > Math.round(tier.minimumQuantity * product.baseUnitPriceCents)) {
        throw new Error("INVALID_ARGUMENT: Bundle total must be positive and no more than base price");
      }
    }
    if (tier.unitPriceCents > product.baseUnitPriceCents) {
      throw new Error("INVALID_ARGUMENT: Bulk unit price cannot exceed the base unit price");
    }
    previousMinimum = tier.minimumQuantity;
  }
}

function calculateLine(input: {
  product: CommerceProduct;
  quantity: number;
  requestedAmountCents?: number;
  loyaltyDiscountRateBps: number;
  loyaltyCombinationPolicy: LoyaltyCombinationPolicy;
}): PricedLine {
  const { product } = input;
  validateProduct(product);
  requireSafeCents(input.loyaltyDiscountRateBps, "loyaltyDiscountRateBps");
  if (input.loyaltyDiscountRateBps > 10_000) {
    throw new Error("INVALID_ARGUMENT: loyaltyDiscountRateBps cannot exceed 10000");
  }
  const quantityValidation = validateSaleQuantity({
    quantity: input.quantity,
    allowFractional: product.allowFractional,
    quantityPrecision: product.quantityPrecision,
    minimumSaleQuantity: product.minimumSaleQuantity,
    quantityIncrement: product.quantityIncrement,
    excessPrecisionPolicy: "round",
  });
  if (!quantityValidation.valid) {
    throw new Error(
      quantityValidationMessage(product.productName, quantityValidation.reason),
    );
  }
  const quantity = quantityValidation.quantity;

  const bulkTier = product.bulkPriceTiers
    .filter((tier) => quantity >= tier.minimumQuantity)
    .at(-1);
  const bulkUnitPriceCents = bulkTier?.bundlePriceCents !== undefined
    ? bulkTier.bundlePriceCents / bulkTier.minimumQuantity
    : bulkTier?.unitPriceCents ?? product.baseUnitPriceCents;
  const baseLineTotalCents = Math.round(quantity * product.baseUnitPriceCents);
  const bulkLineTotalCents = Math.round(quantity * bulkUnitPriceCents);
  const bulkBenefitCents = Math.max(0, baseLineTotalCents - bulkLineTotalCents);
  const loyaltyOnBaseCents = Math.round(
    (baseLineTotalCents * input.loyaltyDiscountRateBps) / 10_000,
  );

  let appliedUnitPriceCents = bulkUnitPriceCents;
  let bulkDiscountCents = bulkBenefitCents;
  let loyaltyDiscountCents = 0;
  let lineSubtotalCents = bulkLineTotalCents;

  if (input.loyaltyCombinationPolicy === "stack") {
    loyaltyDiscountCents = Math.round(
      (bulkLineTotalCents * input.loyaltyDiscountRateBps) / 10_000,
    );
    lineSubtotalCents = bulkLineTotalCents - loyaltyDiscountCents;
  } else if (loyaltyOnBaseCents > bulkBenefitCents) {
    appliedUnitPriceCents = product.baseUnitPriceCents;
    bulkDiscountCents = 0;
    loyaltyDiscountCents = loyaltyOnBaseCents;
    lineSubtotalCents = baseLineTotalCents - loyaltyDiscountCents;
  }

  if (!Number.isSafeInteger(lineSubtotalCents) || lineSubtotalCents <= 0) {
    throw new Error("INVALID_ARGUMENT: Calculated line total is outside the safe range");
  }

  let operatorPriceAdjustmentCents = 0;
  if (input.requestedAmountCents !== undefined) {
    requireSafeCents(input.requestedAmountCents, "requestedAmountCents");
    if (input.requestedAmountCents <= 0) {
      throw new Error("INVALID_ARGUMENT: requestedAmountCents must be positive");
    }
    operatorPriceAdjustmentCents = input.requestedAmountCents - lineSubtotalCents;
    lineSubtotalCents = input.requestedAmountCents;
    appliedUnitPriceCents = lineSubtotalCents / quantity;
  }

  return {
    productId: product.productId,
    productName: product.productName,
    taxable: product.taxable,
    quantity,
    baseUnitPriceCents: product.baseUnitPriceCents,
    appliedUnitPriceCents,
    baseLineTotalCents,
    lineSubtotalCents,
    bulkDiscountCents,
    loyaltyDiscountCents,
    lineDiscountCents: bulkDiscountCents + loyaltyDiscountCents,
    ...(input.requestedAmountCents === undefined ? {} : { requestedAmountCents: input.requestedAmountCents }),
    operatorPriceAdjustmentCents,
  };
}

export function calculateCheckoutPricing(input: {
  lines: Array<{ product: CommerceProduct; quantity: number; requestedAmountCents?: number }>;
  loyaltyDiscountRateBps: number;
  loyaltyCombinationPolicy: LoyaltyCombinationPolicy;
}): CheckoutPricing {
  if (input.lines.length === 0) {
    throw new Error("INVALID_ARGUMENT: Checkout cart cannot be empty");
  }
  const lines = input.lines.map((line) => calculateLine({ ...line, ...input }));
  return lines.reduce<CheckoutPricing>(
    (totals, line) => ({
      lines: [...totals.lines, line],
      merchandiseSubtotalCents:
        totals.merchandiseSubtotalCents + line.baseLineTotalCents,
      taxableMerchandiseCents:
        totals.taxableMerchandiseCents + (line.taxable ? line.lineSubtotalCents : 0),
      discountCents: totals.discountCents + line.lineDiscountCents,
      priceAdjustmentCents: totals.priceAdjustmentCents + line.operatorPriceAdjustmentCents,
      merchandiseTotalCents: totals.merchandiseTotalCents + line.lineSubtotalCents,
    }),
    {
      lines: [],
      merchandiseSubtotalCents: 0,
      taxableMerchandiseCents: 0,
      discountCents: 0,
      priceAdjustmentCents: 0,
      merchandiseTotalCents: 0,
    },
  );
}

export function calculateQuantityForDollarAmount(input: {
  amountCents: number;
  unitPriceCents: number;
  quantityPrecision: number;
}): number {
  requireSafeCents(input.amountCents, "amountCents");
  requireSafeCents(input.unitPriceCents, "unitPriceCents");
  requirePrecision(input.quantityPrecision);
  if (input.amountCents === 0 || input.unitPriceCents === 0) {
    throw new Error("INVALID_ARGUMENT: Dollar and unit price amounts must be positive");
  }
  return roundQuantity(input.amountCents / input.unitPriceCents, input.quantityPrecision);
}

export function calculateSuggestedQuantityForDollarAmount(input: {
  amountCents: number;
  product: CommerceProduct;
}): {
  suggestedQuantity: number;
  appliedUnitPriceCents: number;
  estimatedSubtotalCents: number;
} {
  validateProduct(input.product);
  requireSafeCents(input.amountCents, "amountCents");
  if (input.amountCents === 0) {
    throw new Error("INVALID_ARGUMENT: Dollar amount must be positive");
  }
  const candidates = [
    ...[...input.product.bulkPriceTiers].reverse().map((tier) => ({
      minimumQuantity: tier.minimumQuantity,
      unitPriceCents: tier.unitPriceCents,
      ...(tier.bundlePriceCents === undefined ? {} : { bundlePriceCents: tier.bundlePriceCents }),
    })),
    {
      minimumQuantity: input.product.minimumSaleQuantity,
      unitPriceCents: input.product.baseUnitPriceCents,
      bundlePriceCents: undefined,
    },
  ];
  for (const candidate of candidates) {
    const effectiveUnitPriceCents = candidate.bundlePriceCents === undefined ? candidate.unitPriceCents : candidate.bundlePriceCents / candidate.minimumQuantity;
    const rawQuantity = input.amountCents / effectiveUnitPriceCents;
    const incrementCount = Math.max(
      0,
      Math.round(
        (rawQuantity - input.product.minimumSaleQuantity) /
          input.product.quantityIncrement,
      ),
    );
    const suggestedQuantity = roundQuantity(
      input.product.minimumSaleQuantity +
        incrementCount * input.product.quantityIncrement,
      input.product.quantityPrecision,
    );
    if (suggestedQuantity < candidate.minimumQuantity) continue;
    if (!input.product.allowFractional && !Number.isInteger(suggestedQuantity)) {
      continue;
    }
    return {
      suggestedQuantity,
      appliedUnitPriceCents: effectiveUnitPriceCents,
      estimatedSubtotalCents: Math.round(
        suggestedQuantity * effectiveUnitPriceCents,
      ),
    };
  }
  throw new Error("INVALID_ARGUMENT: Dollar amount is below the minimum sale quantity");
}

export function resolveLoyaltyDiscountRate(
  totalPurchasesCents: number,
  tiers: Array<{ minimumSpendCents: number; discountRateBps: number }>,
): number {
  requireSafeCents(totalPurchasesCents, "totalPurchasesCents");
  const eligible = [...tiers]
    .sort((left, right) => left.minimumSpendCents - right.minimumSpendCents)
    .filter((tier) => totalPurchasesCents >= tier.minimumSpendCents);
  return eligible.at(-1)?.discountRateBps ?? 0;
}
