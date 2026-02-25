import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUICK_POS_EXIT_PIN_FALLBACK } from "@/lib/quick-pos/constants";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";
import type { QuickPosExitVerifyRequest, QuickPosExitVerifyResponse } from "@/lib/quick-pos/types";

export async function POST(request: NextRequest) {
  if (isAuthBypassEnabledServer()) {
    return NextResponse.json({ allowed: true } satisfies QuickPosExitVerifyResponse);
  }

  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as QuickPosExitVerifyRequest;
  const pin = (body.pin || "").trim();

  const settings = await db.businessSettings.findFirst({
    where: { businessId },
    select: { settingsData: true },
  });

  const configuredPin =
    (settings?.settingsData as { quick_pos_exit_pin?: string } | null)?.quick_pos_exit_pin ||
    QUICK_POS_EXIT_PIN_FALLBACK;

  const response: QuickPosExitVerifyResponse = {
    allowed: pin.length > 0 && pin === String(configuredPin),
  };

  return NextResponse.json(response);
}
