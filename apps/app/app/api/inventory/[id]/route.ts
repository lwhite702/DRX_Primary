import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";

const RouteParamsSchema = z.object({
  id: z.string().uuid(),
});

const InventoryUpdateSchema = z
  .object({
    product_name: z.string().min(1).optional(),
    sku: z.string().optional(),
    category: z.string().optional(),
```suggestion
    quantity_on_hand: z.number().finite().int().nonnegative().optional(),
    reorder_level: z.number().finite().optional(),
    unit_cost: z.number().finite().optional(),
    selling_price: z.number().finite().optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedParams = RouteParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid inventory id",
        400,
        parsedParams.error.flatten(),
      );
    }
    const { id } = parsedParams.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const { data: item, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return errorResponse("NOT_FOUND", "Item not found", 404);
    }

    return successResponse({ data: item });
  } catch (error) {
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedParams = RouteParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid inventory id",
        400,
        parsedParams.error.flatten(),
      );
    }
    const { id } = parsedParams.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const parsedPayload = InventoryUpdateSchema.safeParse(await request.json());
    if (!parsedPayload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid inventory update payload",
        400,
        parsedPayload.error.flatten(),
      );
    }

    const { data: updatedItem, error } = await supabase
      .from("inventory")
      .update(parsedPayload.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update Error:", error);
      if (error.code === "42501") {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
      return errorResponse(
        "INTERNAL_ERROR",
        "Failed to update item",
        500,
        error,
      );
    }

    return successResponse({ data: updatedItem });
  } catch (error) {
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}
