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
    const input = body as { phone?: unknown; alias?: unknown; name?: unknown };
    const phone = normalizePhone(input.phone);
    const rawAlias = sanitizePiiInput(input.alias ?? input.name);
    const normalizedAlias = normalizeAlias(rawAlias);
    if (!phone && !normalizedAlias) {
      return NextResponse.json({ error: "Enter a customer name or phone number" }, { status: 400 });
    }
    const context = { businessId, expectedUserId };
    const privacy = await client.query(api.businessPreferences.getPrivacyPolicy, context);
    const displayAlias = rawAlias ?? (phone ? `Customer ${phone.slice(-4)}` : "Customer");
    const storage = await encodeCustomerPii({
      alias: normalizeAlias(displayAlias),
      ...(phone ? { phone } : {}),
    });
    const ephemeral = privacy.ephemeral_profiles.enabled;
    const matchBy = phone ? "phone" : "alias";
    const changedFields = ["alias", ...(phone ? ["phone"] : []), "ephemeral"];
    const result = await client.mutation(api.customers.createOrAttachOperational, {
      ...context,
      ...convexPiiArgs(storage),
      matchBy,
      lastName: null,
      city: null,
      state: null,
      zipCode: null,
      customerType: "retail",
      fixedPricePerGramCents: null,
      creditLimitCents: 0,
      ephemeral,
      ephemeralExpiresAt: ephemeral ? Date.now() + privacy.ephemeral_profiles.default_retention_days * 24 * 60 * 60 * 1000 : null,
      isActive: true,
      changedFields,
    });
    const model = await mapConvexCustomer(result.customer);
    return NextResponse.json(
      {
        id: model.id,
        phone: model.phone || "",
        alias: model.alias || displayAlias,
        ephemeral: model.ephemeral,
        ephemeral_expires_at: model.ephemeral_expires_at,
        remainingCredit: Math.max(0, Number(model.credit_limit || 0) - Number(model.total_credit_used || 0)),
        loyaltyTier: String(model.loyalty_tier || "none"),
        discountRateBps: model.discount_rate_bps != null ? Number(model.discount_rate_bps) : null,
        fixedPricePerGram: model.fixed_price_per_gram != null ? Number(model.fixed_price_per_gram) : null,
        customer: {
          ...result.customer,
          _id: result.customer._id,
          alias: model.alias || displayAlias,
          phoneNumber: model.phone,
        },
      },
      { status: result.created ? 201 : 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return customerFailure(error);
  }
}
