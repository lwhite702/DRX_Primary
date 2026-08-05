/**
 * Migration reconciliation utility comparing record counts, stock sums, and financial totals.
 */
export function reconcileMigrationData(sourcePrismaSnapshot, targetConvexSnapshot) {
  const discrepancies = [];

  const sourceProductsCount = sourcePrismaSnapshot.inventory?.length || 0;
  const targetProductsCount = targetConvexSnapshot.products?.length || 0;
  if (sourceProductsCount !== targetProductsCount) {
    discrepancies.push(
      `Product count mismatch: Source=${sourceProductsCount}, Target=${targetProductsCount}`
    );
  }

  const sourceStockSum = (sourcePrismaSnapshot.inventory || []).reduce(
    (acc, item) => acc + Number(item.quantityOnHand || 0),
    0
  );
  const targetStockSum = (targetConvexSnapshot.products || []).reduce(
    (acc, item) => acc + Number(item.quantityOnHandGrams || 0),
    0
  );
  if (sourceStockSum !== targetStockSum) {
    discrepancies.push(
      `Stock sum mismatch: Source=${sourceStockSum}g, Target=${targetStockSum}g`
    );
  }

  const sourceSalesSumCents = Math.round(
    (sourcePrismaSnapshot.sales || []).reduce(
      (acc, s) => acc + Number(s.totalAmount || 0),
      0
    ) * 100
  );
  const targetSalesSumCents = (targetConvexSnapshot.sales || []).reduce(
    (acc, s) => acc + Number(s.totalAmountCents || 0),
    0
  );
  if (sourceSalesSumCents !== targetSalesSumCents) {
    discrepancies.push(
      `Sales financial sum mismatch: Source=${sourceSalesSumCents}¢, Target=${targetSalesSumCents}¢`
    );
  }

  return {
    reconciled: discrepancies.length === 0,
    discrepancies,
    metrics: {
      sourceProductsCount,
      targetProductsCount,
      sourceStockSum,
      targetStockSum,
      sourceSalesSumCents,
      targetSalesSumCents,
    },
  };
}
