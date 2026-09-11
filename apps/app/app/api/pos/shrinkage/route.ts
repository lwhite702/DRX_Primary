import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { businessClient } from "@/lib/business/convex-server";

const schema = z.object({
  requestId: z.string().min(1).max(200).refine(value => Boolean(value.trim())),
  inventoryId: z.string().regex(/^[a-z0-9]{20,64}$/),
  quantityGrams: z.number().finite().positive(),
  shrinkageType: z.enum(["personal_use", "damaged", "theft", "expired", "lost", "store_use", "sample", "other", "damage", "spillage"]).default("personal_use"),
  note: z.string().max(500).optional(),
});
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { client, ...context } = await businessClient(request);
    const payload = schema.safeParse(await request.json().catch(() => null));
    if (!payload.success) return NextResponse.json({ success: false, code: "INVALID_ARGUMENT", error: "Invalid shrinkage request" }, { status: 400, headers });
    const { inventoryId, ...values } = payload.data;
    const result = await client.mutation(api.shrinkage.record, { ...context, ...values, productId: inventoryId as Id<"products"> });
    return NextResponse.json(result, { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const failures: Array<[string, number, string]> = [
      ["UNAUTHORIZED", 401, "Unauthorized"],
      ["FORBIDDEN", 403, "Inventory permission is required"],
      ["APPROVAL_REQUIRED", 403, "Supervisor approval is required"],
      ["NOT_FOUND", 404, "Product unavailable"],
      ["INVALID_ARGUMENT", 400, "Invalid shrinkage request"],
      ["INSUFFICIENT_STOCK", 409, "Insufficient stock to record this shrinkage"],
      ["CONFLICT", 409, "Retry the original shrinkage request"],
      ["INVALID_STATE", 503, "Inventory or approval settings require reconciliation"],
    ];
    const [code, status, publicMessage] = failures.find(([code]) => message.includes(`${code}:`)) ?? ["UNAVAILABLE", 503, "Shrinkage could not be confirmed. Retry the same request."];
    return NextResponse.json({ success: false, code, error: publicMessage }, { status, headers });
  }
}
