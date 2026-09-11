import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";
import { identifier, privateHeaders, queryParameters, recommendationConnection, recommendationFailure, recommendationFlags, scopeSchema } from "../_lib/recommendations";
const generateSchema = scopeSchema.extend({ requestKey: identifier }).strict();
export async function GET(request: Request) {
  try {
    const parsed = scopeSchema.strict().safeParse(queryParameters(request));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await recommendationConnection(parsed.data.expectedUserId);
    const args = { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId };
    const recommendation = await client.query(api.creditRecommendations.latest, args);
    const policy = await client.query(api.creditPolicy.read, args);
    return NextResponse.json({ recommendation, policy }, { headers: privateHeaders });
  } catch (error) { return recommendationFailure(error); }
}
export async function POST(request: Request) {
  try {
    const parsed = generateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const { client, expectedUserId } = await recommendationConnection(parsed.data.expectedUserId);
    const resolved = await client.query(api.creditPolicy.resolveScope, { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId });
    await recommendationFlags([OPS_AVAILABILITY_FLAGS.creditRefreshCustomer, "feat_credit_refresh"], expectedUserId, resolved.businessId);
    const recommendation = await client.action(api.creditRecommendationGeneration.generate, { businessId: resolved.businessId, customerId: resolved.customerId, expectedUserId, requestKey: parsed.data.requestKey });
    return NextResponse.json({ recommendation, requestKey: parsed.data.requestKey }, { headers: privateHeaders });
  } catch (error) { return recommendationFailure(error); }
}
