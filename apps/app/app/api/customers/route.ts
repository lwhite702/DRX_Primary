import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { encodeCustomerPii } from "@/lib/privacy/customer-pii";
import { canWriteField } from "@/lib/privacy/privacy-policy";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { customerMatchesSearch, normalizeCustomerSearchInput } from "@/lib/customers/core/customer-normalizer";
import { convexPiiArgs, customerFailure, dollarsToCents, mapConvexCustomer } from "@/lib/customers/convex-operational";
import { toTitleCase } from "@/lib/utils/format-text";

const headers = { "Cache-Control": "private, no-store" };

export function parseCustomProductPrices(input: unknown): Array<{ productId: string; productName: string; pricePerUnitCents: number }> | undefined {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter((item) => item && typeof item === "object")
    .map((item: any) => {
      const productId = String(item.productId || "").trim();
      const productName = String(item.productName || "").trim();
      const price = typeof item.pricePerUnit === "number" ? item.pricePerUnit : typeof item.pricePerUnitCents === "number" ? item.pricePerUnitCents / 100 : Number(item.pricePerUnit || 0);
      const pricePerUnitCents = Math.round(price * 100);
      return { productId, productName, pricePerUnitCents };
    })
    .filter((item) => item.productId && item.pricePerUnitCents >= 0);
}

function parseRetentionDays(value: unknown): 1 | 7 | 30 | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return parsed === 1 || parsed === 7 || parsed === 30 ? parsed : null;
}

function providedFields(body: Record<string, unknown>): string[] {
  return [
    ["alias", body.alias], ["first_name", body.first_name ?? body.firstName], ["last_name", body.last_name ?? body.lastName],
    ["phone", body.phone ?? body.phone_number ?? body.phoneNumber], ["email", body.email], ["address", body.address], ["notes", body.notes],
    ["city", body.city], ["state", body.state], ["zip_code", body.zip_code ?? body.zipCode], ["customer_type", body.customer_type ?? body.customerType],
    ["fixed_price_per_gram", body.fixed_price_per_gram ?? body.fixedPricePerGram],
    ["custom_product_prices", body.custom_product_prices ?? body.customProductPrices],
    ["ephemeral", body.ephemeral], ["is_active", body.is_active ?? body.isActive],
  ].filter(([, value]) => value !== undefined).map(([field]) => String(field));
}

function privacyViolations(policy: any, values: Record<string, unknown>) {
  const mapping = { alias: "alias", first_name: "first_name", last_name: "first_name", phone: "phone", email: "email", address: "address", notes: "notes" } as const;
  return Object.entries(values).filter(([field, value]) => sanitizePiiInput(value) && !canWriteField(policy, mapping[field as keyof typeof mapping])).map(([field]) => field);
}

export async function GET(request: NextRequest) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? "active";
    if (status !== "active" && status !== "archived") throw new Error("INVALID_ARGUMENT: Status must be active or archived");
    const limit = Number(params.get("limit") ?? 50);
    const offset = Number(params.get("offset") ?? 0);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0 || offset > 1800) throw new Error("INVALID_ARGUMENT: Invalid customer page");
    const search = normalizeCustomerSearchInput(params.get("search") ?? "");
    const windowSize = Math.min(2000, Math.max(offset + limit, search.hasQuery ? offset + limit * 8 : 1));
    const context = { businessId, expectedUserId };
    const [customers, privacyProtocol] = await Promise.all([
      client.query(api.customers.listOperational, { ...context, isActive: status === "active", windowSize }),
      client.query(api.businessPreferences.getPrivacyPolicy, context),
    ]);
    const mapped = await Promise.all(customers.map(customer => mapConvexCustomer(customer)));
    const filtered = search.hasQuery ? mapped.filter(customer => customerMatchesSearch(customer, search)) : mapped;
    return NextResponse.json({ data: filtered.slice(offset, offset + limit), status, privacy_protocol: privacyProtocol }, { headers });
  } catch (error) {
    return customerFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const parsed: unknown = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_ARGUMENT: Invalid request body");
    const body = parsed as Record<string, unknown>;
    const context = { businessId, expectedUserId };
    const privacyProtocol = await client.query(api.businessPreferences.getPrivacyPolicy, context);
    const rawAlias = sanitizePiiInput(body.alias);
    const rawFirstName = sanitizePiiInput(body.first_name ?? body.firstName);
    const rawLastName = sanitizePiiInput(body.last_name ?? body.lastName);
    const alias = rawAlias ? toTitleCase(rawAlias) : rawAlias;
    const firstName = rawFirstName ? toTitleCase(rawFirstName) : rawFirstName;
    const lastName = rawLastName ? toTitleCase(rawLastName) : rawLastName;
    const phone = sanitizePiiInput(body.phone ?? body.phone_number ?? body.phoneNumber);
    const email = sanitizePiiInput(body.email);
    const address = sanitizePiiInput(body.address);
    const notes = sanitizePiiInput(body.notes);
    const violations = privacyViolations(privacyProtocol, { alias, first_name: firstName, last_name: lastName, phone, email, address, notes });
    if (violations.length) return NextResponse.json({ error: `Blocked by privacy policy: ${violations.join(", ")}` }, { status: 400, headers });
    const ephemeral = body.ephemeral === true;
    if (ephemeral && (!privacyProtocol.ephemeral_profiles.enabled || !privacyProtocol.ephemeral_profiles.allow_in_standard_customer_create)) {
      return NextResponse.json({ error: "Ephemeral profile creation is disabled for standard customer create" }, { status: 400, headers });
    }
    const retentionDays = parseRetentionDays(body.ephemeral_retention_days ?? body.ephemeralRetentionDays) ?? privacyProtocol.ephemeral_profiles.default_retention_days;
    const canStoreName = canWriteField(privacyProtocol, "first_name");
    const canStoreAddress = canWriteField(privacyProtocol, "address");
    const storage = await encodeCustomerPii({ alias, first_name: canStoreName ? firstName : null, phone, email, address: canStoreAddress ? address : null, notes });
    const fixedPricePerGramCents = dollarsToCents(body.fixed_price_per_gram ?? body.fixedPricePerGram, "Fixed price per gram");
    const customProductPrices = parseCustomProductPrices(body.custom_product_prices ?? body.customProductPrices);
    const creditLimitCents = dollarsToCents(body.credit_limit ?? body.creditLimit, "Credit limit") ?? 0;
    const isActive = typeof body.is_active === "boolean" ? body.is_active : typeof body.isActive === "boolean" ? body.isActive : true;
    const customer = await client.mutation(api.customers.createOperational, {
      ...context, ...convexPiiArgs(storage), lastName: canStoreName ? lastName : null,
      city: canStoreAddress ? sanitizePiiInput(body.city) : null, state: canStoreAddress ? sanitizePiiInput(body.state) : null,
      zipCode: canStoreAddress ? sanitizePiiInput(body.zip_code ?? body.zipCode) : null,
      customerType: sanitizePiiInput(body.customer_type ?? body.customerType) ?? "retail",
      fixedPricePerGramCents, customProductPrices, creditLimitCents, ephemeral,
      ephemeralExpiresAt: ephemeral ? Date.now() + retentionDays * 24 * 60 * 60 * 1000 : null,
      isActive, changedFields: providedFields(body),
    });
    return NextResponse.json(await mapConvexCustomer(customer), { status: 201, headers });
  } catch (error) {
    return customerFailure(error);
  }
}
