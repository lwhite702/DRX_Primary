import { NextRequest, NextResponse } from "next/server";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { resolveBusinessPrivacyPolicy } from "@/lib/privacy/privacy-resolution";
import { createOrAttachQuickCustomer } from "@/lib/customers/core/customer-identity";
import { resolveCustomerAccess } from "@/app/api/customers/_lib/server";

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function POST(request: NextRequest) {
  const context = await resolveCustomerAccess(request, "customers.manage");
  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  }
  const { businessId } = context;

  const body = (await request.json()) as { phone?: string; alias?: string };
  const phone = cleanPhone(body.phone || "");
  const alias = sanitizePiiInput(body.alias);

  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  const privacyProtocol = await resolveBusinessPrivacyPolicy(businessId);
  const ephemeralDays =
    privacyProtocol.ephemeral_profiles.default_retention_days;
  const useEphemeral = privacyProtocol.ephemeral_profiles.enabled;

  try {
    const result = await createOrAttachQuickCustomer({
      businessId,
      actorUserId: context.userId,
      phone,
      alias,
      useEphemeral,
      ephemeralRetentionDays: ephemeralDays,
    });

    return NextResponse.json(result.model, {
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    console.error("POS customer quick-create failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
