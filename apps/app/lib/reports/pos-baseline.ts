import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMissingTableError(error: unknown, tableName: string) {
  if (!error || typeof error !== "object") return false;
  const prismaErr = error as { code?: string; message?: string };
  return (
    prismaErr.code === "P2021" &&
    typeof prismaErr.message === "string" &&
    prismaErr.message.includes(tableName)
  );
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date = new Date()) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  return next;
}

export interface PosBaselineReport {
  period: {
    from: string;
    to: string;
    mode: "default" | "custom";
  };
  today: {
    salesTotal: number;
    salesCount: number;
    cashCollected: number;
    costOfGoodsSold: number;
    grossProfit: number;
  };
  week: {
    salesTotal: number;
    salesCount: number;
    costOfGoodsSold: number;
    grossProfit: number;
  };
  previousWeek: {
    salesTotal: number;
    salesCount: number;
    costOfGoodsSold: number;
    grossProfit: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    sku: string | null;
    quantitySold: number;
    revenue: number;
  }>;
  lowStock: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      sku: string;
      quantityOnHand: number;
      lowStockThreshold: number;
    }>;
  };
  credit: {
    outstandingBalance: number;
    activeBalances: number;
  };
  recentSales: Array<{
    id: string;
    total: number;
    costOfGoodsSold: number;
    grossProfit: number;
    costSource: "fifo" | "unallocated";
    paymentMethod: string | null;
    customerId: string | null;
    createdAt: string;
  }>;
  unallocatedSalesCount: number;
  latestAuditAt: string | null;
  generatedAt: string;
}

export async function getPosBaselineReport(
  businessId: string,
  range?: { from?: Date; to?: Date },
): Promise<PosBaselineReport> {
  const now = new Date();
  const hasCustomRange = Boolean(range?.from || range?.to);
  const todayStart = hasCustomRange ? startOfDay(range?.from ?? now) : startOfDay(now);
  const todayEnd = hasCustomRange
    ? (() => {
        const end = new Date(range?.to ?? now);
        end.setHours(23, 59, 59, 999);
        return end;
      })()
    : undefined;
  const weekStart = hasCustomRange ? todayStart : startOfWeek(now);
  const weekEnd = hasCustomRange ? todayEnd : undefined;
  const previousWeekStart = new Date(weekStart);
  const previousWeekEnd = new Date(weekEnd ?? weekStart);
  if (hasCustomRange && weekEnd) {
    const spanMs = weekEnd.getTime() - weekStart.getTime();
    previousWeekStart.setTime(weekStart.getTime() - spanMs - 1);
    previousWeekEnd.setTime(weekStart.getTime() - 1);
  } else {
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  }

  const [
    todaySales,
    weekSales,
    previousWeekSales,
    creditBalances,
    recentSales,
    latestAudit,
    topProductRows,
    lowStockRows,
    lowStockCountRows,
  ] = await Promise.all([
    db.sales.findMany({
      where: {
        businessId,
        orderStatus: "completed",
        createdAt: {
          gte: todayStart,
          ...(todayEnd ? { lte: todayEnd } : {}),
        },
      },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
      },
    }),
    db.sales.findMany({
      where: {
        businessId,
        orderStatus: "completed",
        createdAt: {
          gte: weekStart,
          ...(weekEnd ? { lte: weekEnd } : {}),
        },
      },
      select: { id: true, totalAmount: true },
    }),
    db.sales.findMany({
      where: {
        businessId,
        orderStatus: "completed",
        createdAt: {
          gte: previousWeekStart,
          ...(hasCustomRange ? { lte: previousWeekEnd } : { lt: previousWeekEnd }),
        },
      },
      select: { id: true, totalAmount: true },
    }),
    db.creditLimit.findMany({
      where: {
        businessId,
        currentBalance: { gt: 0 },
      },
      select: { currentBalance: true },
    }),
    db.sales.findMany({
      where: {
        businessId,
        orderStatus: "completed",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
        customerId: true,
        createdAt: true,
      },
    }),
    db.systemAuditLog.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.salesLineItem.groupBy({
      by: ["inventoryId"],
      where: {
        inventoryId: { not: null },
        sale: {
          businessId,
          orderStatus: "completed",
          createdAt: {
            gte: weekStart,
            ...(weekEnd ? { lte: weekEnd } : {}),
          },
        },
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    }),
    db.$queryRaw<
      Array<{ id: string; product_name: string; sku: string; quantity_on_hand: number; reorder_level: number }>
    >(Prisma.sql`
      SELECT id, product_name, sku, quantity_on_hand, reorder_level
      FROM inventory
      WHERE business_id = ${businessId}
        AND quantity_on_hand <= reorder_level
      ORDER BY (reorder_level - quantity_on_hand) DESC, product_name ASC
      LIMIT 20
    `),
    db.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM inventory
      WHERE business_id = ${businessId}
        AND quantity_on_hand <= reorder_level
    `),
  ]);

  const topInventoryIds = topProductRows
    .map((row) => row.inventoryId)
    .filter((value): value is string => Boolean(value));

  const topInventory = topInventoryIds.length
    ? await db.inventory.findMany({
        where: {
          businessId,
          id: { in: topInventoryIds },
        },
        select: {
          id: true,
          productName: true,
          sku: true,
        },
      })
    : [];

  const inventoryById = new Map(topInventory.map((item) => [item.id, item]));

  const topProducts = topProductRows
    .map((row) => {
      if (!row.inventoryId) return null;
      const inventory = inventoryById.get(row.inventoryId);
      if (!inventory) return null;

      return {
        id: inventory.id,
        name: inventory.productName,
        sku: inventory.sku ?? null,
        quantitySold: row._sum.quantity ?? 0,
        revenue: toNumber(row._sum.lineTotal),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const costSaleIds = Array.from(
    new Set(
      [...todaySales, ...weekSales, ...previousWeekSales, ...recentSales]
        .map((sale) => sale.id)
        .filter(Boolean),
    ),
  );

  let saleCosts:
    | Array<{
        saleId: string;
        _sum: { extendedCost: unknown };
      }>
    | [] = [];

  if (costSaleIds.length) {
    try {
      saleCosts = await db.salesLineItemAllocation.groupBy({
        by: ["saleId"],
        where: {
          saleId: { in: costSaleIds },
        },
        _sum: {
          extendedCost: true,
        },
      });
    } catch (error) {
      if (!isMissingTableError(error, "sales_line_item_allocations")) {
        throw error;
      }
      // Keep report APIs available in environments where the allocation table
      // has not been migrated yet. COGS defaults to 0 until migration lands.
      saleCosts = [];
    }
  }

  const cogsBySaleId = new Map(
    saleCosts.map((row) => [row.saleId, toNumber(row._sum.extendedCost)]),
  );
  const unallocatedSaleIds = new Set(
    costSaleIds.filter((saleId) => !cogsBySaleId.has(saleId)),
  );

  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const weekSalesTotal = weekSales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const previousWeekSalesTotal = previousWeekSales.reduce(
    (sum, sale) => sum + toNumber(sale.totalAmount),
    0,
  );
  const cashCollected = todaySales
    .filter((sale) => sale.paymentMethod === "cash")
    .reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const todayCogs = todaySales.reduce((sum, sale) => sum + (cogsBySaleId.get(sale.id) ?? 0), 0);
  const weekCogs = weekSales.reduce((sum, sale) => sum + (cogsBySaleId.get(sale.id) ?? 0), 0);
  const previousWeekCogs = previousWeekSales.reduce(
    (sum, sale) => sum + (cogsBySaleId.get(sale.id) ?? 0),
    0,
  );

  const lowStockCountRaw = lowStockCountRows[0]?.count ?? 0;
  const lowStockCount = typeof lowStockCountRaw === "bigint" ? Number(lowStockCountRaw) : Number(lowStockCountRaw);

  return {
    period: {
      from: weekStart.toISOString(),
      to: (weekEnd ?? now).toISOString(),
      mode: hasCustomRange ? "custom" : "default",
    },
    today: {
      salesTotal: Number(todaySalesTotal.toFixed(2)),
      salesCount: todaySales.length,
      cashCollected: Number(cashCollected.toFixed(2)),
      costOfGoodsSold: Number(todayCogs.toFixed(2)),
      grossProfit: Number((todaySalesTotal - todayCogs).toFixed(2)),
    },
    week: {
      salesTotal: Number(weekSalesTotal.toFixed(2)),
      salesCount: weekSales.length,
      costOfGoodsSold: Number(weekCogs.toFixed(2)),
      grossProfit: Number((weekSalesTotal - weekCogs).toFixed(2)),
    },
    previousWeek: {
      salesTotal: Number(previousWeekSalesTotal.toFixed(2)),
      salesCount: previousWeekSales.length,
      costOfGoodsSold: Number(previousWeekCogs.toFixed(2)),
      grossProfit: Number((previousWeekSalesTotal - previousWeekCogs).toFixed(2)),
    },
    topProducts,
    lowStock: {
      count: lowStockCount,
      items: lowStockRows.map((row) => ({
        id: row.id,
        name: row.product_name,
        sku: row.sku,
        quantityOnHand: row.quantity_on_hand,
        lowStockThreshold: row.reorder_level,
      })),
    },
    credit: {
      outstandingBalance: Number(
        creditBalances.reduce((sum, row) => sum + toNumber(row.currentBalance), 0).toFixed(2),
      ),
      activeBalances: creditBalances.length,
    },
    recentSales: recentSales.map((sale) => ({
      id: sale.id,
      total: toNumber(sale.totalAmount),
      costOfGoodsSold: Number((cogsBySaleId.get(sale.id) ?? 0).toFixed(2)),
      grossProfit: Number((toNumber(sale.totalAmount) - (cogsBySaleId.get(sale.id) ?? 0)).toFixed(2)),
      costSource: cogsBySaleId.has(sale.id) ? "fifo" : "unallocated",
      paymentMethod: sale.paymentMethod ?? null,
      customerId: sale.customerId ?? null,
      createdAt: sale.createdAt.toISOString(),
    })),
    unallocatedSalesCount: unallocatedSaleIds.size,
    latestAuditAt: latestAudit?.createdAt.toISOString() ?? null,
    generatedAt: now.toISOString(),
  };
}
