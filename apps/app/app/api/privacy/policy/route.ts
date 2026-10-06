import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient, businessFailure } from "@/lib/business/convex-server";

/** Effective field/masking policy remains necessary when its configuration UI is disabled. */
export async function GET(request: NextRequest) {
  try {
    const { client, ...context } = await businessClient(request);
    const protocol = await client.query(api.businessPreferences.getPrivacyPolicy, context);
    return NextResponse.json({ protocol }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return businessFailure(error); }
}
