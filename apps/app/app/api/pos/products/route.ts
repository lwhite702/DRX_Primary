import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();

    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
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

    const items = products.map((item: any) => ({
      id: item.id,
      name: item.productName,
      sku: item.sku,
      barcode: null,
      price: toNumber(item.sellingPrice),
      quantity_on_hand: item.quantityOnHand,
      low_stock_threshold: item.reorderLevel,
    }));

    return successResponse({ items, data: items, count: items.length });
  } catch (error: unknown) {
    console.error("POS products lookup error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}
