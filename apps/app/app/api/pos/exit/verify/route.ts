import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import type { QuickPosExitVerifyRequest, QuickPosExitVerifyResponse } from "@/lib/quick-pos/types";

export async function POST(request: NextRequest) {
  if (isAuthBypassEnabledServer()) {
    return NextResponse.json({ allowed: true } satisfies QuickPosExitVerifyResponse);
  }

  const { businessId, userId } = await resolveAuthContext();

  if (!businessId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pinEnforcementEnabled = await ensureServerFlag("feat_pos_exit_pin_enforcement", {
    distinctId: userId,
    personProperties: { business_id: businessId },
    defaultValue: true,
  });
  if (!pinEnforcementEnabled) {
    return NextResponse.json({ allowed: true } satisfies QuickPosExitVerifyResponse);
  }

  const body = (await request.json()) as QuickPosExitVerifyRequest;
  const pin = (body.pin || "").trim();

  const settings = await db.businessSettings.findFirst({
    where: { businessId },
    select: { settingsData: true },
  });

  const configuredPin = (
    settings?.settingsData as { quick_pos_exit_pin?: string } | null
  )?.quick_pos_exit_pin?.trim();

  if (!configuredPin) {
    return NextResponse.json({ allowed: false }, { status: 423 });
  }

  const response: QuickPosExitVerifyResponse = {
    allowed: pin.length > 0 && pin === String(configuredPin),
  };

  return NextResponse.json(response);
}
