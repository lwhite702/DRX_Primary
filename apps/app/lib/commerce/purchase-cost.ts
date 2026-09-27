import { convertUnit, isDimensionless, type DRXUnit } from "../units/convert";

export type PurchaseCostBasis = {
  costCents: number;
  quantity: number;
  unit: DRXUnit;
  /** Supplier's actual net amount in the selling unit, when different from the label. */
  actualSellingQuantity?: number;
};

export function calculatePurchaseUnitCost(
  basis: PurchaseCostBasis,
  sellingUnit: DRXUnit,
): { sellingQuantity: number; unitCostCentsExact: number } {
  if (!Number.isSafeInteger(basis.costCents) || basis.costCents < 0 ||
      !Number.isFinite(basis.quantity) || basis.quantity <= 0) {
    throw new Error("Enter a valid purchase price and quantity");
  }
  if (basis.actualSellingQuantity !== undefined &&
      (!Number.isFinite(basis.actualSellingQuantity) || basis.actualSellingQuantity <= 0)) {
    throw new Error("Actual net quantity must be greater than zero");
  }
  if (isDimensionless(basis.unit) !== isDimensionless(sellingUnit)) {
    throw new Error("Purchase and selling units must measure the same kind of product");
  }
  const convertedQuantity = convertUnit(basis.quantity, basis.unit, sellingUnit);
  const sellingQuantity = basis.actualSellingQuantity ?? convertedQuantity;
  const unitCostCentsExact = basis.costCents / sellingQuantity;
  if (!Number.isFinite(unitCostCentsExact) || unitCostCentsExact < 0 ||
      !Number.isSafeInteger(Math.round(unitCostCentsExact))) {
    throw new Error("Purchase cost exceeds supported precision");
  }
  return { sellingQuantity, unitCostCentsExact };
}
