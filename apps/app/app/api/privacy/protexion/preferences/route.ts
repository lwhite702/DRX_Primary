import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient, businessFailure } from "@/lib/business/convex-server";
import { z } from "zod";

const input = z.object({ manual_enabled: z.boolean() }).strict();
export async function GET(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return NextResponse.json({ manual_enabled: false }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const { client, ...context } = await businessClient(request);
    const preference = await client.query(api.businessPreferences.getManualPreference, context);
    const manualEnabled = preference?.manual_enabled ?? (await client.query(api.businessPreferences.getPrivacyPolicy, context)).screen_privacy.default_enabled;
    return NextResponse.json({ manual_enabled: manualEnabled }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return businessFailure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { client, ...context } = await businessClient(request);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    const result = await client.mutation(api.businessPreferences.setManualPreference, { ...context, manualEnabled: parsed.data.manual_enabled });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return businessFailure(error); }
}
