import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decodeCustomerPii, encodeCustomerPii } from "@/lib/privacy/customer-pii";
import { canWriteField } from "@/lib/privacy/privacy-policy";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { mapCustomerToOperationalModel } from "@/lib/customers/core/customer-normalizer";
import { resolveBusinessPrivacyPolicy } from "@/lib/privacy/privacy-resolution";
import { resolveCustomerAccess } from "../_lib/server";

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

async function mapResponse(customer: any, metrics?: unknown) {
  const pii = await decodeCustomerPii(customer);
  return {
    ...mapCustomerToOperationalModel(customer, pii),
    metrics,
  };
}

function blockedByPrivacy(
  privacyProtocol: Awaited<ReturnType<typeof resolveBusinessPrivacyPolicy>>,
  field: Parameters<typeof canWriteField>[1],
  value: unknown,
) {
  return !!sanitizePiiInput(value) && !canWriteField(privacyProtocol, field);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const context = await resolveCustomerAccess(request, "customers.view");
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status },
      );
    }
    const { businessId } = context;

    const customerId = params.id;

    const customer = await db.customers.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    let metrics = null;
    try {
      const metricsData = await db.$queryRaw`
        SELECT 
          sales_30d, sales_90d, sales_all_time, 
          credit_issued_30d, credit_issued_90d, 
          current_credit_balance, on_time_repayment_ratio, 
          late_payment_count 
        FROM v_credit_analytics 
        WHERE customer_id = ${customerId}::uuid
        LIMIT 1
      `;

      if (Array.isArray(metricsData) && metricsData.length > 0) {
        metrics = metricsData[0];
      }
    } catch (error) {
      console.warn("Customer analytics lookup failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return NextResponse.json(await mapResponse(customer, metrics));
  } catch (error) {
    console.error("Get customer failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleUpdate(request, params.id);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return handleUpdate(request, params.id);
}

async function handleUpdate(request: NextRequest, customerId: string) {
  try {
    const context = await resolveCustomerAccess(request, "customers.manage");
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status },
      );
    }
    const { businessId } = context;

    const body = await request.json();

    const customer = await db.customers.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const privacyProtocol = await resolveBusinessPrivacyPolicy(businessId);
    const currentPii = await decodeCustomerPii(customer);

    const incomingAlias = body.alias;
    const incomingFirstName = body.firstName ?? body.first_name;
    const incomingPhone = body.phoneNumber ?? body.phone_number ?? body.phone;
    const incomingEmail = body.email;
    const incomingAddress = body.address;
    const incomingNotes = body.notes;
    const incomingEphemeral =
      typeof body.ephemeral === "boolean" ? body.ephemeral : undefined;
    const incomingEphemeralDays = parseEphemeralRetentionDays(
      body.ephemeral_retention_days ?? body.ephemeralRetentionDays,
    );

    if (blockedByPrivacy(privacyProtocol, "alias", incomingAlias)) {
      return NextResponse.json({ error: "Alias updates are disabled" }, { status: 400 });
    }
    if (blockedByPrivacy(privacyProtocol, "first_name", incomingFirstName)) {
      return NextResponse.json({ error: "First name updates are disabled" }, { status: 400 });
    }
    if (blockedByPrivacy(privacyProtocol, "phone", incomingPhone)) {
      return NextResponse.json({ error: "Phone updates are disabled" }, { status: 400 });
    }
    if (blockedByPrivacy(privacyProtocol, "email", incomingEmail)) {
      return NextResponse.json({ error: "Email updates are disabled" }, { status: 400 });
    }
    if (blockedByPrivacy(privacyProtocol, "address", incomingAddress)) {
      return NextResponse.json({ error: "Address updates are disabled" }, { status: 400 });
    }
    if (blockedByPrivacy(privacyProtocol, "notes", incomingNotes)) {
      return NextResponse.json({ error: "Notes updates are disabled" }, { status: 400 });
    }

    if (
      incomingEphemeral === true &&
      (!privacyProtocol.ephemeral_profiles.enabled ||
        !privacyProtocol.ephemeral_profiles.allow_in_standard_customer_create)
    ) {
      return NextResponse.json(
        {
          error: "Ephemeral profile creation is disabled for standard customer update",
        },
        { status: 400 },
      );
    }

    const nextPii = {
      alias:
        incomingAlias !== undefined ? sanitizePiiInput(incomingAlias) : currentPii.alias,
      first_name:
        incomingFirstName !== undefined
          ? sanitizePiiInput(incomingFirstName)
          : currentPii.first_name,
      phone:
        incomingPhone !== undefined ? sanitizePiiInput(incomingPhone) : currentPii.phone,
      email:
        incomingEmail !== undefined ? sanitizePiiInput(incomingEmail) : currentPii.email,
      address:
        incomingAddress !== undefined
          ? sanitizePiiInput(incomingAddress)
          : currentPii.address,
      notes:
        incomingNotes !== undefined ? sanitizePiiInput(incomingNotes) : currentPii.notes,
    };

    const piiStorage = await encodeCustomerPii(nextPii);

    const updated = await db.customers.update({
      where: { id: customerId },
      data: {
        alias: null,
        firstName: null,
        phoneNumber: null,
        email: null,
        address: null,
        notes: null,
        lastName:
          body.lastName !== undefined || body.last_name !== undefined
            ? sanitizePiiInput(body.lastName ?? body.last_name)
            : customer.lastName,
        city: body.city !== undefined ? sanitizePiiInput(body.city) : customer.city,
        state:
          body.state !== undefined ? sanitizePiiInput(body.state) : customer.state,
        zipCode:
          body.zipCode !== undefined || body.zip_code !== undefined
            ? sanitizePiiInput(body.zipCode ?? body.zip_code)
            : customer.zipCode,
        customerType:
          body.customerType !== undefined || body.customer_type !== undefined
            ? sanitizePiiInput(body.customerType ?? body.customer_type)
            : customer.customerType,
        fixedPricePerGram:
          body.fixedPricePerGram !== undefined || body.fixed_price_per_gram !== undefined
            ? parseNumeric(body.fixedPricePerGram ?? body.fixed_price_per_gram)
            : customer.fixedPricePerGram,
        ephemeral:
          incomingEphemeral !== undefined ? incomingEphemeral : customer.ephemeral,
        ephemeralExpiresAt:
          incomingEphemeral !== undefined
            ? incomingEphemeral
              ? buildEphemeralExpiry(
                  incomingEphemeralDays ??
                    privacyProtocol.ephemeral_profiles.default_retention_days,
                )
              : null
            : incomingEphemeralDays
              ? customer.ephemeral
                ? buildEphemeralExpiry(incomingEphemeralDays)
                : customer.ephemeralExpiresAt
              : customer.ephemeralExpiresAt,
        lastActivityAt: new Date(),
        ...piiStorage,
      },
    });

    return NextResponse.json(await mapResponse(updated));
  } catch (error) {
    console.error("Update customer failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
