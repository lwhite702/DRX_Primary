import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("search")?.trim() || "";

  const products = await db.inventory.findMany({
    where: {
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
    take: 30,
    select: {
      id: true,
      productName: true,
      sellingPrice: true,
      quantityOnHand: true,
    },
  });

  return NextResponse.json({
    items: products.map((item) => ({
      id: item.id,
      name: item.productName,
      price: toNumber(item.sellingPrice),
      quantity_on_hand: item.quantityOnHand,
    })),
  });
}
