import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse } from "@/lib/api/response";
import { hasBusinessPermission } from "@/lib/auth/server-guards";

const RouteParamsSchema = z.object({ id: z.string().min(1) });
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

const InventoryUpdateSchema = z
  .object({
    product_name: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    unit_of_measure: z.enum(["g", "oz", "lb", "L", "ml"]).optional(),
    quantity_on_hand: z.number().int().nonnegative().optional(),
    reorder_level: z.number().int().nonnegative().optional(),
    unit_cost: z.number().nonnegative().optional(),
    selling_price: z.number().nonnegative().optional(),
    supplier_id: z.string().uuid().optional(),
    business_id: z.string().uuid().optional(),
    id: z.string().uuid().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function resolveInventory(
  request: NextRequest,
  context: RouteContext,
  permission: "catalog.view" | "inventory.manage",
) {
  const rawParams = await Promise.resolve(context.params);
  const parsedParams = RouteParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) return { error: "invalid" as const };

  const { userId, businessId } = await resolveAuthContext(request);
  if (!userId || !businessId) return { error: "unauthorized" as const };
  if (!(await hasBusinessPermission(userId, businessId, permission))) {
    return { error: "forbidden" as const };
  }

  const item = await db.inventory.findFirst({
    where: { id: parsedParams.data.id, businessId },
  });
  if (!item) return { error: "missing" as const };
  return { item, userId, businessId };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const resolved = await resolveInventory(request, context, "catalog.view");
    if (resolved.error === "invalid") return errorResponse("VALIDATION_ERROR", "Invalid inventory id", 400);
    if (resolved.error === "unauthorized") return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    if (resolved.error === "forbidden") return errorResponse("FORBIDDEN", "Forbidden", 403);
    if (resolved.error === "missing") return errorResponse("NOT_FOUND", "Item not found", 404);
    return NextResponse.json({ data: resolved.item });
  } catch (error) {
    console.error("Inventory item lookup error", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const resolved = await resolveInventory(request, context, "inventory.manage");
    if (resolved.error === "invalid") return errorResponse("VALIDATION_ERROR", "Invalid inventory id", 400);
    if (resolved.error === "unauthorized") return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    if (resolved.error === "forbidden") return errorResponse("FORBIDDEN", "Forbidden", 403);
    if (resolved.error === "missing") return errorResponse("NOT_FOUND", "Item not found", 404);

    const payload = InventoryUpdateSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid inventory update payload", 400, payload.error.flatten());
    }

    const input = payload.data;
    const quantityChanged =
      input.quantity_on_hand !== undefined &&
      input.quantity_on_hand !== resolved.item.quantityOnHand;

    const updatedItem = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.inventory.update({
        where: { id: resolved.item.id },
        data: {
          ...(input.product_name !== undefined ? { productName: input.product_name } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.unit_of_measure !== undefined ? { baseUnit: input.unit_of_measure } : {}),
          ...(input.quantity_on_hand !== undefined ? { quantityOnHand: input.quantity_on_hand } : {}),
          ...(input.reorder_level !== undefined ? { reorderLevel: input.reorder_level } : {}),
          ...(input.unit_cost !== undefined ? { unitCost: input.unit_cost } : {}),
          ...(input.selling_price !== undefined ? { sellingPrice: input.selling_price } : {}),
          ...(input.supplier_id !== undefined ? { supplierId: input.supplier_id } : {}),
        },
      });

      if (quantityChanged) {
        const creatorId = await resolveCreatorUuid(tx, resolved.userId);
        await tx.inventoryLog.create({
          data: {
            inventoryId: resolved.item.id,
            transactionType: "adjustment",
            quantityChange: input.quantity_on_hand! - resolved.item.quantityOnHand,
            reason: "Inventory update via /api/inventory/[id]",
            createdBy: creatorId,
          },
        });
      }
      return updated;
    });

    return NextResponse.json({ data: updatedItem });
  } catch (error: unknown) {
    console.error("Inventory item update error", error);
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return errorResponse("BAD_REQUEST", "SKU already exists for this business", 409);
    }
    return errorResponse("INTERNAL_ERROR", "Failed to update item", 500);
  }
}
