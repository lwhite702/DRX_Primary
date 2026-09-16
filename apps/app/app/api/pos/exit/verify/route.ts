import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient, businessFailure } from "@/lib/business/convex-server";
import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

async function verify(request: NextRequest, readPin: boolean) {
  if (isAuthBypassEnabledServer()) return NextResponse.json({ allowed: true, hasPinConfigured: false });
  try {
    const { client, ...context } = await businessClient(request);
    const enabled = await ensureServerFlag("feat_pos_exit_pin_enforcement", { distinctId: context.expectedUserId, personProperties: { business_id: context.businessId }, defaultValue: true });
    if (!enabled) return NextResponse.json({ allowed: true, hasPinConfigured: false });
    let pin: string | undefined;
    if (readPin) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body) || (body.pin !== undefined && (typeof body.pin !== "string" || body.pin.length > 50))) throw new Error("INVALID_ARGUMENT:");
      pin = body.pin ?? "";
    }
    return NextResponse.json(await client.query(api.businessPreferences.verifyExitPin, { ...context, pin }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return businessFailure(error); }
}
export async function GET(request: NextRequest) { return verify(request, false); }
export async function POST(request: NextRequest) { return verify(request, true); }
