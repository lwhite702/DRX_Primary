import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { encodeCustomerPii } from "@/lib/privacy/customer-pii";
import { sanitizePiiInput } from "@/lib/privacy/crypto";
import { normalizeAlias, normalizePhone } from "@/lib/customers/core/customer-normalizer";
import { convexPiiArgs, customerFailure, mapConvexCustomer } from "@/lib/customers/convex-operational";

export async function POST(request: NextRequest) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_ARGUMENT: Invalid request body");
    const input = body as { phone?: unknown; alias?: unknown };
    const phone = normalizePhone(input.phone);
    if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    const context = { businessId, expectedUserId };
    const privacy = await client.query(api.businessPreferences.getPrivacyPolicy, context);
    const alias = sanitizePiiInput(input.alias) ?? `Customer ${phone.slice(-4)}`;
    const storage = await encodeCustomerPii({ alias: normalizeAlias(alias), phone });
    const ephemeral = privacy.ephemeral_profiles.enabled;
    const result = await client.mutation(api.customers.createOrAttachOperational, {
      ...context, ...convexPiiArgs(storage), matchBy: "phone", lastName: null, city: null, state: null, zipCode: null,
      customerType: "retail", fixedPricePerGramCents: null, creditLimitCents: 0, ephemeral,
      ephemeralExpiresAt: ephemeral ? Date.now() + privacy.ephemeral_profiles.default_retention_days * 24 * 60 * 60 * 1000 : null,
      isActive: true, changedFields: ["alias", "phone", "ephemeral"],
    });
    const model = await mapConvexCustomer(result.customer);
    return NextResponse.json({ id: model.id, phone: model.phone, alias: model.alias || `Customer ${phone.slice(-4)}`, ephemeral: model.ephemeral, ephemeral_expires_at: model.ephemeral_expires_at, remainingCredit: Math.max(0, Number(model.credit_limit || 0) - Number(model.total_credit_used || 0)) }, { status: result.created ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return customerFailure(error);
  }
}
