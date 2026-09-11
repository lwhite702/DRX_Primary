import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { newProductCommerceSchema } from "@/lib/commerce/product-creation";
import {
  commerceSettingsSchema,
  readCommerceSettings,
} from "@/lib/commerce/config";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toValidUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_REGEX.test(value.trim())
    ? value.trim()
    : null;
}

async function resolveCreatorUuid(
  tx: Prisma.TransactionClient,
  userId: string | null | undefined,
): Promise<string | null> {
  const directUuid = toValidUuid(userId);
  if (directUuid) return directUuid;
  if (!userId || typeof userId !== "string") return null;

  try {
    const userDelegate = (tx as unknown as { user?: { findFirst?: (args: unknown) => unknown } }).user;
    if (typeof userDelegate?.findFirst === "function") {
      const result = await userDelegate.findFirst({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      if (result && typeof result === "object" && "id" in result) {
        return toValidUuid(result.id);
      }
    }
  } catch {
    // Fall back to null if user lookup is unsupported or fails
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json(
        { error: "Endpoint GET Unauthorized" },
        { status: 401 },
      );
    }
    if (!(await hasBusinessPermission(userId, businessId, "catalog.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    const where: Prisma.InventoryWhereInput = {
      businessId: businessId,
    };

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const inventory = await db.inventory.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: inventory });
  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, businessId } = await resolveAuthContext(
      typeof body.business_id === "string" ? body.business_id : request,
    );
    if (!userId || !businessId) {
      return NextResponse.json(
        { error: "Endpoint POST Unauthorized" },
        { status: 401 },
      );
    }
    if (
      !(await hasBusinessPermission(userId, businessId, "inventory.manage"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const {
      sku,
      product_name,
      description,
      category,
      quantity_on_hand,
      reorder_level,
      unit_cost,
      selling_price,
      supplier_id,
      unit_of_measure,
    } = body;

    // Validation
    if (!sku || !product_name) {
      return NextResponse.json(
        { error: "SKU and Product Name are required" },
        { status: 400 },
      );
    }

    const commerce =
      body.commerce_config === undefined
        ? undefined
        : newProductCommerceSchema.safeParse(body.commerce_config);
    if (commerce && !commerce.success) {
      return NextResponse.json(
        { error: commerce.error.issues[0]?.message || "Invalid selling rules" },
        { status: 400 },
      );
    }
    const config = commerce?.success ? commerce.data : undefined;
    if (
      config &&
      (!Number.isFinite(selling_price) ||
        selling_price <= 0 ||
        !Number.isSafeInteger(Math.round(selling_price * 100)) ||
        Math.abs(selling_price * 100 - Math.round(selling_price * 100)) >
          1e-6 ||
        !Number.isSafeInteger(quantity_on_hand ?? 0) ||
        (quantity_on_hand ?? 0) < 0 ||
        !Number.isSafeInteger(reorder_level ?? 10) ||
        (reorder_level ?? 10) < 0 ||
        (unit_cost !== undefined &&
          unit_cost !== null &&
          (!Number.isFinite(unit_cost) || unit_cost < 0)))
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a positive price with at most two decimal places and nonnegative whole-number starting stock and reorder level. Receive fractional stock through inventory intake.",
        },
        { status: 400 },
      );
    }

    try {
      const createItem = (tx: Pick<Prisma.TransactionClient, "inventory">) =>
        tx.inventory.create({
          data: {
            businessId,
            sku,
            productName: product_name,
            description,
            category,
            quantityOnHand: quantity_on_hand || 0,
            reorderLevel: reorder_level ?? 10,
            unitCost: unit_cost ?? null,
            sellingPrice: selling_price,
            supplierId: supplier_id,
            baseUnit: config?.sellingUnit || unit_of_measure || "g",
            ...(config
              ? {
                  allowFractionalWeight: config.fractionalEnabled,
                  pricePerGram: config.fractionalEnabled ? selling_price : null,
                  inventoryInGrams: config.fractionalEnabled
                    ? (quantity_on_hand ?? 0)
                    : 0,
                }
              : {}),
          },
        });

      // No success response can escape with a product but missing selling rules.
      // Serializable isolation also prevents concurrent creates from replacing
      // each other's entries in the transitional settings JSON.
      const newItem = config
        ? await db.$transaction(
            async (tx: Prisma.TransactionClient) => {
              const item = await createItem(tx);
              const current = await tx.businessSettings.findUnique({
                where: { businessId },
                select: { settingsData: true },
              });
              const settingsData =
                current?.settingsData &&
                typeof current.settingsData === "object" &&
                !Array.isArray(current.settingsData)
                  ? { ...current.settingsData }
                  : {};
              if (
                settingsData.commerce !== undefined &&
                !commerceSettingsSchema.safeParse(settingsData.commerce).success
              ) {
                throw new Error(
                  "Existing commerce settings need repair before adding selling rules",
                );
              }
              const settings = readCommerceSettings(settingsData);
              settings.productConfigs[item.id] = config;
              const data = {
                ...settingsData,
                commerce: settings,
              } as Prisma.InputJsonValue;
              await tx.businessSettings.upsert({
                where: { businessId },
                create: { businessId, settingsData: data },
                update: { settingsData: data },
              });
              const creatorId = await resolveCreatorUuid(tx, userId);
              await tx.inventoryLog.create({
                data: {
                  inventoryId: item.id,
                  transactionType: "creation",
                  quantityChange: quantity_on_hand ?? 0,
                  reason: "Product created with selling rules",
                  createdBy: creatorId,
                },
              });
              return item;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          )
        : await createItem(db);

      return NextResponse.json(newItem, { status: 201 });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
      ) {
        return NextResponse.json(
          {
            error:
              "Another product changed during saving. Nothing was created; please try again.",
          },
          { status: 409 },
        );
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        // Unique constraint violation (likely SKU)
        return NextResponse.json(
          { error: "SKU already exists for this business" },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Inventory API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
