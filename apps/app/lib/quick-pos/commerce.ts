export interface BulkPriceTier {
  id: string;
  label: string;
  minimumQuantity: number;
  unitPrice: number;
}

export interface FractionalProductConfig {
  sellingUnit: string;
  decimalPrecision: number;
  minimumSaleQuantity: number;
  quantityIncrement: number;
  baseUnitPrice: number;
  bulkPriceTiers: BulkPriceTier[];
}

export interface FractionalLine {
  quantity: number;
  sellingUnit: string;
  unitPrice: number;
  lineTotal: number;
  bulkTier: BulkPriceTier | null;
}

export interface DeliveryFinancialInput {
  vendorFeeCents: number;
  feeAllocation: "charge_customer" | "absorb";
  feeTaxable: boolean;
  taxRate: number;
}

export function calculateDeliveryFinancials(input: DeliveryFinancialInput) {
  const vendorDeliveryExpenseCents = Math.max(
    0,
    Math.round(input.vendorFeeCents),
  );
  const deliveryRevenueCents =
    input.feeAllocation === "charge_customer"
      ? vendorDeliveryExpenseCents
      : 0;
  const deliveryTaxCents =
    input.feeTaxable && deliveryRevenueCents > 0
      ? Math.round(
          deliveryRevenueCents * Math.max(0, Math.min(1, input.taxRate)),
        )
      : 0;

  return {
    deliveryRevenueCents,
    vendorDeliveryExpenseCents,
    deliveryTaxCents,
    customerChargeCents: deliveryRevenueCents + deliveryTaxCents,
    deliveryProfitCents:
      deliveryRevenueCents - vendorDeliveryExpenseCents,
  };
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function boundedPrecision(value: number) {
  return Math.max(0, Math.min(6, Math.trunc(value)));
}

function validTiers(config: FractionalProductConfig) {
  return config.bulkPriceTiers
    .filter(
      (tier) =>
        tier.minimumQuantity > 0 &&
        tier.unitPrice > 0 &&
        Number.isFinite(tier.minimumQuantity) &&
        Number.isFinite(tier.unitPrice),
    )
    .sort((left, right) => right.minimumQuantity - left.minimumQuantity);
}

function roundToSaleGrid(
  value: number,
  minimum: number,
  increment: number,
  precision: number,
  direction: "nearest" | "down",
) {
  const safeIncrement = increment > 0 ? increment : 1 / 10 ** precision;
  const safeMinimum = Math.max(0, minimum);
  if (value < safeMinimum) return 0;
  const steps = (value - safeMinimum) / safeIncrement;
  const roundedSteps =
    direction === "down" ? Math.floor(steps + 1e-9) : Math.round(steps);
  return Number(
    (safeMinimum + roundedSteps * safeIncrement).toFixed(precision),
  );
}

export function selectBulkPriceTier(
  quantity: number,
  config: FractionalProductConfig,
) {
  return (
    validTiers(config).find((tier) => quantity >= tier.minimumQuantity) ?? null
  );
}

export function calculateFractionalLine(
  requestedQuantity: number,
  config: FractionalProductConfig,
): FractionalLine {
  const precision = boundedPrecision(config.decimalPrecision);
  const quantity = roundToSaleGrid(
    Math.max(0, requestedQuantity),
    config.minimumSaleQuantity,
    config.quantityIncrement,
    precision,
    "nearest",
  );
  const bulkTier = selectBulkPriceTier(quantity, config);
  const unitPrice = bulkTier?.unitPrice ?? config.baseUnitPrice;

  return {
    quantity,
    sellingUnit: config.sellingUnit,
    unitPrice,
    lineTotal: roundCurrency(quantity * unitPrice),
    bulkTier,
  };
}

export function suggestQuantityForDollars(
  requestedDollars: number,
  config: FractionalProductConfig,
): FractionalLine & { belowMinimum: boolean } {
  const dollars = Math.max(0, requestedDollars);
  const precision = boundedPrecision(config.decimalPrecision);
  const quantityIncrement =
    config.quantityIncrement > 0
      ? config.quantityIncrement
      : 1 / 10 ** precision;

  const candidateTier = validTiers(config).find((tier) => {
    const candidateQuantity = roundToSaleGrid(
      dollars / tier.unitPrice,
      config.minimumSaleQuantity,
      quantityIncrement,
      precision,
      "down",
    );
    return candidateQuantity >= tier.minimumQuantity;
  });
  const unitPrice = candidateTier?.unitPrice ?? config.baseUnitPrice;
  const quantity =
    unitPrice > 0
      ? roundToSaleGrid(
          dollars / unitPrice,
          config.minimumSaleQuantity,
          quantityIncrement,
          precision,
          "down",
        )
      : 0;
  const belowMinimum = quantity < config.minimumSaleQuantity;

  return {
    quantity: belowMinimum ? 0 : quantity,
    sellingUnit: config.sellingUnit,
    unitPrice,
    lineTotal: belowMinimum ? 0 : roundCurrency(quantity * unitPrice),
    bulkTier: candidateTier ?? null,
    belowMinimum,
  };
}
