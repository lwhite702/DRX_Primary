import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { errorResponse, successResponse } from "@/lib/api/response";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import {
  getDefaultProductCommerceConfig,
  merchantCommerceSettingsSchema,
  productCommerceConfigSchema,
  readCommerceSettings,
} from "@/lib/commerce/config";

const commercePatchSchema = z
  .object({
    merchant: merchantCommerceSettingsSchema.optional(),
    product: z
      .object({
        inventoryId: z.string().uuid(),
        baseUnitPrice: z.number().positive(),
        config: productCommerceConfigSchema,
      })
      .optional(),
  })
  .refine((value) => value.merchant || value.product, {
    message: "Merchant or product configuration is required",
  });

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

type CommerceInventoryRow = {
  id: string;
  productName: string;
  sku: string;
  baseUnit: string | null;
  sellingPrice: Prisma.Decimal | null;
  pricePerGram: Prisma.Decimal | null;
  allowFractionalWeight: boolean | null;
  inventoryInGrams: Prisma.Decimal | null;
  quantityOnHand: number;
};

export async function GET() {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }
    if (
      !(await hasBusinessPermission(userId, businessId, "settings.configure_pos"))
    ) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const [settings, inventory, customers] = await Promise.all([
      db.businessSettings.findUnique({
        where: { businessId },
        select: { settingsData: true },
      }),
      db.inventory.findMany({
        where: { businessId },
        orderBy: { productName: "asc" },
        select: {
          id: true,
          productName: true,
          sku: true,
          baseUnit: true,
          sellingPrice: true,
          pricePerGram: true,
          allowFractionalWeight: true,
          inventoryInGrams: true,
          quantityOnHand: true,
        },
      }),
      db.customers.findMany({
        where: { businessId, isActive: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 500,
        select: {
          id: true,
          alias: true,
          firstName: true,
          lastName: true,
        },
      }),
    ]);

    const commerce = readCommerceSettings(settings?.settingsData);
    const products = inventory.map((item: CommerceInventoryRow) => {
      const stored = commerce.productConfigs[item.id];
      const fallback = getDefaultProductCommerceConfig();
      const config = stored ?? {
        ...fallback,
        fractionalEnabled:
          item.allowFractionalWeight === true && toNumber(item.pricePerGram) > 0,
        sellingUnit: item.baseUnit || fallback.sellingUnit,
        decimalPrecision: item.allowFractionalWeight === true ? 2 : 0,
        minimumSaleQuantity: item.allowFractionalWeight === true ? 0.01 : 1,
        quantityIncrement: item.allowFractionalWeight === true ? 0.01 : 1,
      };

      return {
        id: item.id,
        name: item.productName,
        sku: item.sku,
        baseUnitPrice:
          toNumber(item.pricePerGram) || toNumber(item.sellingPrice),
        availableQuantity:
          config.fractionalEnabled
            ? toNumber(item.inventoryInGrams)
            : item.quantityOnHand,
        config,
      };
    });

    return successResponse({
      businessId,
      merchant: commerce.merchant,
      products,
      customers: customers.map((customer: {
        id: string;
        alias: string | null;
        firstName: string | null;
        lastName: string | null;
      }) => ({
        id: customer.id,
        label:
          customer.alias ||
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          `Customer ${customer.id.slice(0, 8)}`,
      })),
    });
  } catch (error) {
    console.error("GET commerce settings error", error);
    return errorResponse("INTERNAL_ERROR", "Unable to load commerce settings", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }
    if (
      !(await hasBusinessPermission(userId, businessId, "settings.configure_pos"))
    ) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const parsed = commercePatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid commerce settings",
        400,
        parsed.error.flatten(),
      );
    }

    const saved = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.businessSettings.findUnique({
        where: { businessId },
        select: { settingsData: true },
      });
      const settingsData = asObject(current?.settingsData);
      const commerce = readCommerceSettings(settingsData);

      if (parsed.data.merchant) {
        commerce.merchant = parsed.data.merchant;
      }

      if (parsed.data.product) {
        const inventory = await tx.inventory.findFirst({
          where: {
            id: parsed.data.product.inventoryId,
            businessId,
          },
          select: { id: true },
        });
        if (!inventory) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        commerce.productConfigs[parsed.data.product.inventoryId] =
          parsed.data.product.config;
        await tx.inventory.update({
          where: { id: parsed.data.product.inventoryId },
          data: {
            allowFractionalWeight:
              parsed.data.product.config.fractionalEnabled,
            baseUnit: parsed.data.product.config.sellingUnit,
            pricePerGram: parsed.data.product.config.fractionalEnabled
              ? new Prisma.Decimal(
                  parsed.data.product.baseUnitPrice.toFixed(4),
                )
              : undefined,
          },
        });
      }

      settingsData.commerce = commerce;
      await tx.businessSettings.upsert({
        where: { businessId },
        update: {
          settingsData: settingsData as Prisma.InputJsonValue,
        },
        create: {
          businessId,
          settingsData: settingsData as Prisma.InputJsonValue,
        },
      });

      return commerce;
    });

    return successResponse(saved);
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return errorResponse("NOT_FOUND", "Product not found", 404);
    }
    console.error("PATCH commerce settings error", error);
    return errorResponse("INTERNAL_ERROR", "Unable to save commerce settings", 500);
  }
}
