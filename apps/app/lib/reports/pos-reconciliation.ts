import "server-only";

import { db } from "@/lib/db";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type ReconciliationCode =
  | "SALE_TOTAL_MISMATCH"
  | "LINE_ALLOCATION_GAP"
  | "INVENTORY_LOG_MISSING"
  | "INVENTORY_LOG_QUANTITY_MISMATCH";

export interface PosReconciliationReport {
  period: {
    from: string;
    to: string;
  };
  summary: {
    salesChecked: number;
    discrepancies: number;
    discrepancyByCode: Record<ReconciliationCode, number>;
  };
  discrepancies: Array<{
    code: ReconciliationCode;
    saleId: string;
    saleLineItemId?: string;
    inventoryId?: string;
    expected: number | string;
    actual: number | string;
    message: string;
  }>;
}

export async function getPosReconciliationReport(
  businessId: string,
  range?: { from?: Date; to?: Date },
): Promise<PosReconciliationReport> {
  const from = range?.from ? new Date(range.from) : new Date();
  from.setHours(0, 0, 0, 0);
  const to = range?.to ? new Date(range.to) : new Date();
  to.setHours(23, 59, 59, 999);

  const sales = await db.sales.findMany({
    where: {
      businessId,
      orderStatus: "completed",
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    select: {
      id: true,
      subtotal: true,
      totalAmount: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          inventoryId: true,
          quantity: true,
          lineTotal: true,
          weightSoldGrams: true,
          allocations: {
            select: {
              quantityGrams: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const discrepancies: PosReconciliationReport["discrepancies"] = [];

  for (const sale of sales) {
    const lineTotalSum = sale.items.reduce(
      (sum: number, item: any) => sum + toNumber(item.lineTotal),
      0,
    );
    const merchandiseSubtotal = toNumber(sale.subtotal);
    if (Math.abs(lineTotalSum - merchandiseSubtotal) > 0.01) {
      discrepancies.push({
        code: "SALE_TOTAL_MISMATCH",
        saleId: sale.id,
        expected: Number(merchandiseSubtotal.toFixed(2)),
        actual: Number(lineTotalSum.toFixed(2)),
        message: "Merchandise subtotal does not match sum of line totals.",
      });
    }

    for (const item of sale.items) {
      if (!item.inventoryId) {
        continue;
      }

      const expectedAllocationQty = toNumber(item.weightSoldGrams) > 0
        ? toNumber(item.weightSoldGrams)
        : item.quantity;
      const actualAllocationQty = item.allocations.reduce(
        (sum: number, allocation: any) => sum + toNumber(allocation.quantityGrams),
        0,
      );

      if (Math.abs(expectedAllocationQty - actualAllocationQty) > 0.0001) {
        discrepancies.push({
          code: "LINE_ALLOCATION_GAP",
          saleId: sale.id,
          saleLineItemId: item.id,
          inventoryId: item.inventoryId,
          expected: Number(expectedAllocationQty.toFixed(4)),
          actual: Number(actualAllocationQty.toFixed(4)),
          message: "Allocated FIFO quantity does not match sold quantity.",
        });
      }

      const windowStart = new Date(sale.createdAt.getTime() - 120000);
      const windowEnd = new Date(sale.createdAt.getTime() + 120000);
      const matchingLog = await db.inventoryLog.findFirst({
        where: {
          inventoryId: item.inventoryId,
          transactionType: "sale",
          createdAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          quantityChange: true,
        },
      });

      if (!matchingLog) {
        discrepancies.push({
          code: "INVENTORY_LOG_MISSING",
          saleId: sale.id,
          saleLineItemId: item.id,
          inventoryId: item.inventoryId,
          expected: item.quantity,
          actual: "missing",
          message: "No nearby sale inventory log found for line item.",
        });
      } else if (
        toNumber(item.weightSoldGrams) <= 0 &&
        toNumber(matchingLog.quantityChange) !== -item.quantity
      ) {
        discrepancies.push({
          code: "INVENTORY_LOG_QUANTITY_MISMATCH",
          saleId: sale.id,
          saleLineItemId: item.id,
          inventoryId: item.inventoryId,
          expected: -item.quantity,
          actual: toNumber(matchingLog.quantityChange),
          message: "Inventory log quantity change does not match sold quantity.",
        });
      }
    }
  }

  const discrepancyByCode: Record<ReconciliationCode, number> = {
    SALE_TOTAL_MISMATCH: 0,
    LINE_ALLOCATION_GAP: 0,
    INVENTORY_LOG_MISSING: 0,
    INVENTORY_LOG_QUANTITY_MISMATCH: 0,
  };

  for (const entry of discrepancies) {
    discrepancyByCode[entry.code] += 1;
  }

  return {
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    summary: {
      salesChecked: sales.length,
      discrepancies: discrepancies.length,
      discrepancyByCode,
    },
    discrepancies,
  };
}
