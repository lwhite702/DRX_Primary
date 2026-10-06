import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient, businessFailure } from "@/lib/business/convex-server";

import { getDefaultPrivacyProtocol } from "@/lib/privacy/profiles";

/** Effective field/masking policy remains necessary when its configuration UI is disabled. */
export async function GET(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return NextResponse.json({ protocol: getDefaultPrivacyProtocol() }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const { client, ...context } = await businessClient(request);
    const protocol = await client.query(api.businessPreferences.getPrivacyPolicy, context);
    return NextResponse.json({ protocol }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return businessFailure(error); }
}
