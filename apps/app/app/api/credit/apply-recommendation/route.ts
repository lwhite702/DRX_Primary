import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";
import { identifier, privateHeaders, recommendationConnection, recommendationFailure, recommendationFlags } from "../_lib/recommendations";
const applySchema = z.object({ business_id: identifier, expectedUserId: identifier, recommendationId: identifier, requestKey: identifier }).strict();
export async function POST(request: Request) {
  try {
    const parsed = applySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await recommendationConnection(parsed.data.expectedUserId);
    const args = { businessId: parsed.data.business_id, expectedUserId, recommendationId: parsed.data.recommendationId as Id<"creditRecommendations"> };
    // Saved reads authorize customer/financial access and the selected tenant before flag evaluation.
    const saved = await client.query(api.creditRecommendations.get, args);
    await recommendationFlags([OPS_AVAILABILITY_FLAGS.creditApplyRecommendation, "feat_credit_refresh"], expectedUserId, saved.businessId);
    const result = await client.mutation(api.creditRecommendations.apply, { ...args, requestKey: parsed.data.requestKey });
    return NextResponse.json({ result, requestKey: parsed.data.requestKey }, { headers: privateHeaders });
  } catch (error) { return recommendationFailure(error); }
}

/** Resolve an uncertain attempt; this never reverses an applied policy. */
export async function DELETE(request: Request) {
  try {
    const parsed = applySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await recommendationConnection(parsed.data.expectedUserId);
    const result = await client.mutation(api.creditRecommendations.cancelApply, { businessId: parsed.data.business_id, expectedUserId, recommendationId: parsed.data.recommendationId as Id<"creditRecommendations">, requestKey: parsed.data.requestKey });
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) { return recommendationFailure(error); }
}
