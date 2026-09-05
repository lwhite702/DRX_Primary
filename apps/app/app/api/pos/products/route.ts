import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  getDefaultProductCommerceConfig,
  readCommerceSettings,
} from "@/lib/commerce/config";

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

    const settings = await db.businessSettings.findUnique({
      where: { businessId },
      select: { settingsData: true },
    });
    const commerce = readCommerceSettings(settings?.settingsData);

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
        inventoryInGrams: true,
        pricePerGram: true,
        baseUnit: true,
        allowFractionalWeight: true,
      },
    });

    const fallback = getDefaultProductCommerceConfig();
    const items = products.map((item: any) => {
      const stored = commerce.productConfigs[item.id];
      const fractionalEnabled =
        stored?.fractionalEnabled ??
        (item.allowFractionalWeight === true && toNumber(item.pricePerGram) > 0);
      const config = {
        ...(stored ?? fallback),
        fractionalEnabled,
        sellingUnit: stored?.sellingUnit ?? item.baseUnit ?? fallback.sellingUnit,
        decimalPrecision: stored?.decimalPrecision ?? (fractionalEnabled ? 2 : 0),
        minimumSaleQuantity:
          stored?.minimumSaleQuantity ?? (fractionalEnabled ? 0.01 : 1),
        quantityIncrement:
          stored?.quantityIncrement ?? (fractionalEnabled ? 0.01 : 1),
        baseUnitPrice: toNumber(item.pricePerGram) || toNumber(item.sellingPrice),
      };
      return {
        id: item.id,
        name: item.productName,
        sku: item.sku,
        barcode: null,
        price: toNumber(item.sellingPrice),
        quantity_on_hand: fractionalEnabled
          ? toNumber(item.inventoryInGrams)
          : item.quantityOnHand,
        low_stock_threshold: item.reorderLevel,
        commerce_config: config,
        fractional_config: fractionalEnabled ? config : undefined,
      };
    });

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
