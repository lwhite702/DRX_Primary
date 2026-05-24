import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { encodeCustomerPii } from "@/lib/privacy/customer-pii";
import { canWriteField } from "@/lib/privacy/privacy-policy";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { findCustomersForSearch } from "@/lib/customers/core/customer-search";
import { mapOperationalCustomerRecord } from "@/lib/customers/core/customer-identity";
import { resolveBusinessPrivacyPolicy } from "@/lib/privacy/privacy-resolution";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

async function resolveBusinessId(userId: string): Promise<string | null> {
  const ownedBusiness = await db.businessProfile.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (ownedBusiness?.id) {
    return ownedBusiness.id;
  }

  const userRole = await db.userRole.findFirst({
    where: { userId },
    select: { businessId: true },
  });

  return userRole?.businessId ?? null;
}

function parseNumeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseEphemeralRetentionDays(value: unknown): 1 | 7 | 30 | null {
  const parsed = parseNumeric(value);
  if (parsed === 1 || parsed === 7 || parsed === 30) {
    return parsed;
  }
  return null;
}

function buildEphemeralExpiry(days: 1 | 7 | 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function collectWriteViolations(
  privacyProtocol: Awaited<ReturnType<typeof resolveBusinessPrivacyPolicy>>,
  values: Record<string, unknown>,
): string[] {
  const fieldMap = {
    alias: "alias",
    first_name: "first_name",
    phone: "phone",
    email: "email",
    address: "address",
    notes: "notes",
  } as const;

  const violations: string[] = [];

  for (const [field, value] of Object.entries(values)) {
    if (!sanitizePiiInput(value)) continue;
    const privacyField = fieldMap[field as keyof typeof fieldMap];
    if (!privacyField) continue;
    if (!canWriteField(privacyProtocol, privacyField)) {
      violations.push(field);
    }
  }

  return violations;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = await resolveBusinessId(userId);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found for user" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const useDeterministicLookup = await ensureServerFlag(
      "feat_customer_hash_lookup_v2",
      {
        distinctId: userId,
        groups: { business: businessId },
        defaultValue: true,
      },
    );

    const [rows, privacyProtocol] = await Promise.all([
      useDeterministicLookup
        ? findCustomersForSearch({
            businessId,
            search,
            limit,
            offset,
          })
        : (async () => {
            const where: any = {
              businessId,
              isActive: true,
            };

            if (search) {
              where.OR = [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { phoneNumber: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ];
            }

            const customers = await db.customers.findMany({
              where,
              take: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 50,
              skip: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
              orderBy: { createdAt: "desc" },
            });

            return Promise.all(
              customers.map((customer: any) => mapOperationalCustomerRecord(customer)),
            );
          })(),
      resolveBusinessPrivacyPolicy(businessId),
    ]);

    return NextResponse.json({ data: rows, privacy_protocol: privacyProtocol });
  } catch (error) {
    console.error("Customers API Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = await resolveBusinessId(userId);
    if (!businessId) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await request.json();
    const privacyProtocol = await resolveBusinessPrivacyPolicy(businessId);

    const alias = body.alias;
    const firstName = body.first_name ?? body.firstName;
    const phone = body.phone ?? body.phone_number ?? body.phoneNumber;
    const email = body.email;
    const address = body.address;
    const notes = body.notes;
    const requestedEphemeral = body.ephemeral === true;
    const requestedRetentionDays = parseEphemeralRetentionDays(
      body.ephemeral_retention_days ?? body.ephemeralRetentionDays,
    );

    const writeViolations = collectWriteViolations(privacyProtocol, {
      alias,
      first_name: firstName,
      phone,
      email,
      address,
      notes,
    });

    if (writeViolations.length > 0) {
      return NextResponse.json(
        {
          error: `Blocked by privacy policy: ${writeViolations.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (
      requestedEphemeral &&
      (!privacyProtocol.ephemeral_profiles.enabled ||
        !privacyProtocol.ephemeral_profiles.allow_in_standard_customer_create)
    ) {
      return NextResponse.json(
        {
          error: "Ephemeral profile creation is disabled for standard customer create",
        },
        { status: 400 },
      );
    }

    const effectiveEphemeral = requestedEphemeral;
    const effectiveEphemeralDays =
      requestedRetentionDays ?? privacyProtocol.ephemeral_profiles.default_retention_days;

    const piiStorage = await encodeCustomerPii({
      alias,
      first_name: firstName,
      phone,
      email,
      address,
      notes,
    });

    const fixedPricePerGram = parseNumeric(
      body.fixed_price_per_gram ?? body.fixedPricePerGram,
    );

    const newCustomer = await db.customers.create({
      data: {
        businessId,
        alias: null,
        firstName: null,
        lastName: sanitizePiiInput(body.last_name ?? body.lastName),
        phoneNumber: null,
        email: null,
        address: null,
        notes: null,
        city: sanitizePiiInput(body.city),
        state: sanitizePiiInput(body.state),
        zipCode: sanitizePiiInput(body.zip_code ?? body.zipCode),
        customerType:
          sanitizePiiInput(body.customer_type ?? body.customerType) || "retail",
        fixedPricePerGram,
        isActive:
          typeof body.is_active === "boolean"
            ? body.is_active
            : typeof body.isActive === "boolean"
              ? body.isActive
              : true,
        ephemeral: effectiveEphemeral,
        ephemeralExpiresAt: effectiveEphemeral
          ? buildEphemeralExpiry(effectiveEphemeralDays)
          : null,
        lastActivityAt: new Date(),
        ...piiStorage,
      },
    });

    return NextResponse.json(await mapOperationalCustomerRecord(newCustomer), {
      status: 201,
    });
  } catch (error) {
    console.error("Create Customer Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
