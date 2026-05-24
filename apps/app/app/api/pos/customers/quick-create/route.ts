import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { resolveBusinessPrivacyPolicy } from "@/lib/privacy/privacy-resolution";
import { createOrAttachQuickCustomer } from "@/lib/customers/core/customer-identity";

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function POST(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { phone?: string; alias?: string };
  const phone = cleanPhone(body.phone || "");
  const alias = sanitizePiiInput(body.alias);

  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  const privacyProtocol = await resolveBusinessPrivacyPolicy(businessId);
  const ephemeralDays = privacyProtocol.ephemeral_profiles.default_retention_days;
  const useEphemeral = privacyProtocol.ephemeral_profiles.enabled;

  try {
    const result = await createOrAttachQuickCustomer({
      businessId,
      phone,
      alias,
      useEphemeral,
      ephemeralRetentionDays: ephemeralDays,
    });

    return NextResponse.json(result.model, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("[pos/customers/quick-create]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create customer",
      },
      { status: 500 },
    );
  }
}
