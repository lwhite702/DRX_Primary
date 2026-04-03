import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  decodeCustomerPii,
  encodeCustomerPii,
  getCustomerDisplayName,
} from "@/lib/privacy/customer-pii";
import { hashLookupValue, sanitizePiiInput } from "@/lib/privacy/crypto";
import { extractPrivacyProtocol } from "@/lib/privacy/settings";

function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function buildEphemeralExpiry(days: 1 | 7 | 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
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

  const settings = await db.businessSettings.findFirst({
    where: { businessId },
    select: { settingsData: true },
  });
  const privacyProtocol = extractPrivacyProtocol(settings?.settingsData);
  const ephemeralDays = privacyProtocol.ephemeral_profiles.default_retention_days;
  const useEphemeral = privacyProtocol.ephemeral_profiles.enabled;

  let phoneHash: string | null = null;
  try {
    phoneHash = await hashLookupValue(phone);
  } catch (error) {
    console.warn("[privacy] phone hash lookup unavailable", error);
  }

  const existing = await db.customers.findFirst({
    where: {
      businessId,
      isActive: true,
      OR: [
        ...(phoneHash ? [{ phoneHash }] : []),
        { phoneNumber: phone },
      ],
    },
  });

  if (existing) {
    const pii = await decodeCustomerPii(existing as unknown as Record<string, unknown>);
    return NextResponse.json({
      id: existing.id,
      phone: pii.phone || phone,
      alias: getCustomerDisplayName(pii),
      ephemeral: !!existing.ephemeral,
      ephemeral_expires_at: existing.ephemeralExpiresAt || null,
      remainingCredit: 0,
    });
  }

  const piiStorage = await encodeCustomerPii({
    alias: alias || `Customer ${phone.slice(-4)}`,
    phone,
  });

  const created = await db.customers.create({
    data: {
      businessId,
      alias: null,
      firstName: null,
      lastName: null,
      phoneNumber: null,
      email: null,
      address: null,
      notes: null,
      customerType: "retail",
      isActive: true,
      ephemeral: useEphemeral,
      ephemeralExpiresAt: useEphemeral
        ? buildEphemeralExpiry(ephemeralDays)
        : null,
      lastActivityAt: new Date(),
      ...piiStorage,
    },
  });

  const pii = await decodeCustomerPii(created as unknown as Record<string, unknown>);

  return NextResponse.json(
    {
      id: created.id,
      phone: pii.phone || phone,
      alias: getCustomerDisplayName(pii),
      ephemeral: useEphemeral,
      ephemeral_expires_at: created.ephemeralExpiresAt || null,
      remainingCredit: 0,
    },
    { status: 201 },
  );
}
