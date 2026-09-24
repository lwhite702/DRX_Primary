import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { encodeCustomerPii } from "@/lib/privacy/customer-pii";
import { canWriteField } from "@/lib/privacy/privacy-policy";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { convexPiiArgs, customerFailure, dollarsToCents, mapConvexCustomer } from "@/lib/customers/convex-operational";

const headers = { "Cache-Control": "private, no-store" };
type RouteParams = { params: Promise<{ id: string }> | { id: string } };

function parseRetentionDays(value: unknown): 1 | 7 | 30 | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return parsed === 1 || parsed === 7 || parsed === 30 ? parsed : null;
}

function providedFields(body: Record<string, unknown>): string[] {
  return [
    ["alias", body.alias], ["first_name", body.firstName ?? body.first_name], ["last_name", body.lastName ?? body.last_name],
    ["phone", body.phoneNumber ?? body.phone_number ?? body.phone], ["email", body.email], ["address", body.address], ["notes", body.notes],
    ["city", body.city], ["state", body.state], ["zip_code", body.zipCode ?? body.zip_code], ["customer_type", body.customerType ?? body.customer_type],
    ["fixed_price_per_gram", body.fixedPricePerGram ?? body.fixed_price_per_gram], ["credit_limit", body.creditLimit ?? body.credit_limit],
    ["ephemeral", body.ephemeral], ["is_active", body.isActive ?? body.is_active],
  ].filter(([, value]) => value !== undefined).map(([field]) => String(field));
}

function privacyBlocked(policy: any, field: Parameters<typeof canWriteField>[1], value: unknown) {
  return Boolean(sanitizePiiInput(value)) && !canWriteField(policy, field);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await Promise.resolve(params);
    const { client, businessId, expectedUserId } = await businessClient(request);
    const result = await client.query(api.customers.getOperational, { businessId, expectedUserId, customerId: id });
    return NextResponse.json({ ...(await mapConvexCustomer(result.customer, result.metrics)), transaction_history: result.transactionHistory }, { headers });
  } catch (error) {
    return customerFailure(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleUpdate(request, (await Promise.resolve(params)).id);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleUpdate(request, (await Promise.resolve(params)).id);
}

async function handleUpdate(request: NextRequest, customerId: string) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const parsed: unknown = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_ARGUMENT: Invalid request body");
    const body = parsed as Record<string, unknown>;
    const context = { businessId, expectedUserId };
    const [detail, privacyProtocol] = await Promise.all([
      client.query(api.customers.getOperational, { ...context, customerId }),
      client.query(api.businessPreferences.getPrivacyPolicy, context),
    ]);
    const current = await mapConvexCustomer(detail.customer);
    const incomingAlias = body.alias;
    const incomingFirstName = body.firstName ?? body.first_name;
    const incomingLastName = body.lastName ?? body.last_name;
    const incomingPhone = body.phoneNumber ?? body.phone_number ?? body.phone;
    const incomingEmail = body.email;
    const incomingAddress = body.address;
    const incomingNotes = body.notes;
    const checks = [
      ["Alias", "alias", incomingAlias], ["First name", "first_name", incomingFirstName], ["Last name", "first_name", incomingLastName],
      ["Phone", "phone", incomingPhone], ["Email", "email", incomingEmail], ["Address", "address", incomingAddress], ["Notes", "notes", incomingNotes],
    ] as const;
    for (const [label, field, value] of checks) {
      if (privacyBlocked(privacyProtocol, field, value)) return NextResponse.json({ error: `${label} updates are disabled` }, { status: 400, headers });
    }
    const incomingEphemeral = typeof body.ephemeral === "boolean" ? body.ephemeral : undefined;
    if (incomingEphemeral === true && (!privacyProtocol.ephemeral_profiles.enabled || !privacyProtocol.ephemeral_profiles.allow_in_standard_customer_create)) {
      return NextResponse.json({ error: "Ephemeral profile creation is disabled for standard customer update" }, { status: 400, headers });
    }
    const canStoreName = canWriteField(privacyProtocol, "first_name");
    const canStoreAddress = canWriteField(privacyProtocol, "address");
    const nextPii = {
      alias: incomingAlias !== undefined ? sanitizePiiInput(incomingAlias) : sanitizePiiInput(current.alias),
      first_name: canStoreName ? incomingFirstName !== undefined ? sanitizePiiInput(incomingFirstName) : sanitizePiiInput(current.first_name) : null,
      phone: incomingPhone !== undefined ? sanitizePiiInput(incomingPhone) : sanitizePiiInput(current.phone),
      email: incomingEmail !== undefined ? sanitizePiiInput(incomingEmail) : sanitizePiiInput(current.email),
      address: canStoreAddress ? incomingAddress !== undefined ? sanitizePiiInput(incomingAddress) : sanitizePiiInput(current.address) : null,
      notes: incomingNotes !== undefined ? sanitizePiiInput(incomingNotes) : sanitizePiiInput(current.notes),
    };
    const storage = await encodeCustomerPii(nextPii);
    const currentDoc = detail.customer as Record<string, any>;
    const retentionDays = parseRetentionDays(body.ephemeral_retention_days ?? body.ephemeralRetentionDays);
    const ephemeral = incomingEphemeral ?? Boolean(currentDoc.ephemeral);
    const ephemeralExpiresAt = incomingEphemeral !== undefined
      ? incomingEphemeral ? Date.now() + (retentionDays ?? privacyProtocol.ephemeral_profiles.default_retention_days) * 24 * 60 * 60 * 1000 : null
      : retentionDays && ephemeral ? Date.now() + retentionDays * 24 * 60 * 60 * 1000 : currentDoc.ephemeralExpiresAt ?? null;
    const fixedInput = body.fixedPricePerGram ?? body.fixed_price_per_gram;
    const creditInput = body.creditLimit ?? body.credit_limit;
    const updated = await client.mutation(api.customers.updateOperational, {
      ...context, customerId, ...convexPiiArgs(storage),
      lastName: canStoreName ? incomingLastName !== undefined ? sanitizePiiInput(incomingLastName) : currentDoc.lastName ?? null : null,
      city: canStoreAddress ? body.city !== undefined ? sanitizePiiInput(body.city) : currentDoc.city ?? null : null,
      state: canStoreAddress ? body.state !== undefined ? sanitizePiiInput(body.state) : currentDoc.state ?? null : null,
      zipCode: canStoreAddress ? body.zipCode !== undefined || body.zip_code !== undefined ? sanitizePiiInput(body.zipCode ?? body.zip_code) : currentDoc.zipCode ?? null : null,
      customerType: sanitizePiiInput(body.customerType ?? body.customer_type) ?? currentDoc.customerType ?? "retail",
      fixedPricePerGramCents: fixedInput !== undefined ? dollarsToCents(fixedInput, "Fixed price per gram") : currentDoc.fixedPricePerGramCents ?? null,
      creditLimitCents: creditInput !== undefined ? dollarsToCents(creditInput, "Credit limit") ?? 0 : currentDoc.creditLimitCents,
      ephemeral, ephemeralExpiresAt,
      isActive: typeof body.isActive === "boolean" ? body.isActive : typeof body.is_active === "boolean" ? body.is_active : currentDoc.isActive,
      changedFields: providedFields(body),
    });
    return NextResponse.json(await mapConvexCustomer(updated), { headers });
  } catch (error) {
    return customerFailure(error);
  }
}
