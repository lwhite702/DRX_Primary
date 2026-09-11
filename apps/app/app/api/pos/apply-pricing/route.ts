import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intelligenceClient, headers, failure } from "../../ai/_lib/convex";
const schema = z.object({ businessId: z.string().min(1), recommendationId: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, businessId, expectedUserId } = await intelligenceClient(parsed.data.businessId);
    const result = await client.mutation(api.inventoryIntelligence.applyPricing, { businessId, expectedUserId, analysisId: parsed.data.recommendationId as Id<"inventoryAnalyses"> });
    return NextResponse.json({ ...result, message: "Pricing updated successfully" }, { headers });
  } catch (error) { return failure(error); }
}
