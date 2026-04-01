import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("search")?.trim() || "";
  const exact = new URL(request.url).searchParams.get("exact") === "1";

  const exactWhere = query
    ? {
        businessId,
        OR: [
          { sku: { equals: query, mode: "insensitive" as const } },
          { productName: { equals: query, mode: "insensitive" as const } },
        ],
      }
    : null;

  const products = await db.inventory.findMany({
    where:
      exact && exactWhere
        ? exactWhere
        : {
            businessId,
            ...(query
              ? {
                  OR: [
                    { productName: { contains: query, mode: "insensitive" } },
                    { sku: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
    orderBy: {
      productName: "asc",
    },
    take: exact ? 5 : 30,
    select: {
      id: true,
      productName: true,
      sku: true,
      sellingPrice: true,
      quantityOnHand: true,
      reorderLevel: true,
    },
  });

  return NextResponse.json({
    items: products.map((item) => ({
      id: item.id,
      name: item.productName,
      sku: item.sku,
      barcode: null,
      price: toNumber(item.sellingPrice),
      quantity_on_hand: item.quantityOnHand,
      low_stock_threshold: item.reorderLevel,
    })),
  });
}
