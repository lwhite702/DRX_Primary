import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  QUICK_POS_FAVORITES_LIMIT,
  QUICK_POS_RECENT_LIMIT,
} from "@/lib/quick-pos/constants";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import type { QuickPosBootstrapResponse } from "@/lib/quick-pos/types";

export async function GET() {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topSellers = await db.salesLineItem.groupBy({
    by: ["inventoryId"],
    where: {
      sale: {
        businessId,
        orderStatus: "completed",
      },
      inventoryId: { not: null },
    },
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: { quantity: "desc" },
    },
    take: QUICK_POS_FAVORITES_LIMIT,
  });

  const topInventoryIds = topSellers
    .map((row) => row.inventoryId)
    .filter((id): id is string => Boolean(id));

  const topInventory = topInventoryIds.length
    ? await db.inventory.findMany({
        where: { businessId, id: { in: topInventoryIds } },
        select: {
          id: true,
          productName: true,
          sellingPrice: true,
        },
      })
    : [];

  const inventoryById = new Map(topInventory.map((item) => [item.id, item]));

  const favorites = topInventoryIds
    .map((id) => inventoryById.get(id))
    .filter(Boolean)
    .map((item) => ({
      id: item!.id,
      name: item!.productName,
      price: toNumber(item!.sellingPrice),
    }));

  const recentItems = await db.salesLineItem.findMany({
    where: {
      sale: {
        businessId,
        orderStatus: "completed",
      },
      inventoryId: { not: null },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: QUICK_POS_RECENT_LIMIT * 2,
    select: {
      inventoryId: true,
      inventory: {
        select: {
          id: true,
          productName: true,
          sellingPrice: true,
        },
      },
    },
  });

  const seen = new Set<string>();
  const recentlySold = [] as QuickPosBootstrapResponse["recentlySold"];

  for (const row of recentItems) {
    if (!row.inventoryId || !row.inventory || seen.has(row.inventoryId)) {
      continue;
    }

    seen.add(row.inventoryId);
    recentlySold.push({
      id: row.inventory.id,
      name: row.inventory.productName,
      price: toNumber(row.inventory.sellingPrice),
    });

    if (recentlySold.length >= QUICK_POS_RECENT_LIMIT) break;
  }

  const creditAccounts = await db.creditLimit.count({
    where: {
      businessId,
      maxCreditLimit: {
        gt: 0,
      },
    },
  });

  const payload: QuickPosBootstrapResponse = {
    favorites,
    recentlySold,
    creditPolicy: {
      enabled: creditAccounts > 0,
    },
  };

  return NextResponse.json(payload);
}
