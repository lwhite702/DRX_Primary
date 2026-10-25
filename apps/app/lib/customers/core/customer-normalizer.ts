import type { CustomerPiiFields } from "@/lib/privacy/customer-pii";

export interface CustomerSearchNormalization {
  raw: string;
  alias: string;
  phone: string | null;
  email: string | null;
  hasQuery: boolean;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeAlias(value: unknown): string {
  if (typeof value !== "string") return "";
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = normalizeWhitespace(value).toLowerCase().normalize("NFKC");
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export function normalizeCustomerSearchInput(value: unknown): CustomerSearchNormalization {
  const raw = typeof value === "string" ? normalizeWhitespace(value) : "";
  const alias = normalizeAlias(raw);
  return {
    raw,
    alias,
    phone: normalizePhone(raw),
    email: normalizeEmail(raw),
    hasQuery: raw.length > 0,
  };
}

export function toNumberSafe(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    try {
      const parsed = (value as { toNumber: () => number }).toNumber();
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      return 0;
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapCustomerToOperationalModel(
  customer: any,
  pii: CustomerPiiFields,
): Record<string, unknown> {
  return {
    id: customer.id,
    customer_id: customer.id,
    business_id: customer.businessId,
    alias: pii.alias || "",
    first_name: pii.first_name || "",
    firstName: pii.first_name || "",
    last_name: customer.lastName || "",
    lastName: customer.lastName || "",
    phone: pii.phone || "",
    phone_number: pii.phone || "",
    phoneNumber: pii.phone || "",
    email: pii.email || "",
    address: pii.address || "",
    notes: pii.notes || "",
    city: customer.city || "",
    state: customer.state || "",
    zip_code: customer.zipCode || "",
    zipCode: customer.zipCode || "",
    customer_type: customer.customerType || "retail",
    loyalty_tier: customer.loyaltyTier || "none",
    loyalty_points: 0,
    purchase_count: toNumberSafe(customer.purchaseCount),
    total_purchases: toNumberSafe(customer.totalPurchases),
    total_credit_used: toNumberSafe(customer.totalCreditUsed),
    fixed_price_per_gram:
      customer.fixedPricePerGram !== null && customer.fixedPricePerGram !== undefined
        ? toNumberSafe(customer.fixedPricePerGram)
        : null,
    custom_product_prices: Array.isArray(customer.customProductPrices)
      ? customer.customProductPrices.map((p: any) => ({
          productId: String(p.productId),
          productName: String(p.productName),
          pricePerUnit: typeof p.pricePerUnit === "number" ? p.pricePerUnit : Number(p.pricePerUnitCents ?? 0) / 100,
        }))
      : [],
    customProductPrices: Array.isArray(customer.customProductPrices)
      ? customer.customProductPrices.map((p: any) => ({
          productId: String(p.productId),
          productName: String(p.productName),
          pricePerUnit: typeof p.pricePerUnit === "number" ? p.pricePerUnit : Number(p.pricePerUnitCents ?? 0) / 100,
        }))
      : [],
    discount_rate_bps:
      customer.discountRateBps !== null && customer.discountRateBps !== undefined
        ? toNumberSafe(customer.discountRateBps)
        : null,
    discount_rate:
      customer.discountRateBps !== null && customer.discountRateBps !== undefined
        ? toNumberSafe(customer.discountRateBps) / 10000
        : null,
    credit_limit: (() => {
      const limitRecord = Array.isArray(customer.creditLimits) ? customer.creditLimits[0] : undefined;
      if (limitRecord?.maxCreditLimit != null) return toNumberSafe(limitRecord.maxCreditLimit);
      return 0;
    })(),
    is_active: customer.isActive,
    ephemeral: !!customer.ephemeral,
    ephemeral_expires_at: customer.ephemeralExpiresAt || null,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    last_activity_at: customer.lastActivityAt,
  };
}

export function customerMatchesSearch(
  row: { alias?: string | null; first_name?: string | null; last_name?: string | null; phone?: string | null; email?: string | null },
  search: CustomerSearchNormalization,
): boolean {
  if (!search.hasQuery) return true;

  const searchAlias = search.alias;
  const searchPhone = search.phone;
  const searchEmail = search.email;

  const alias = normalizeAlias(row.alias || "");
  const firstName = normalizeAlias(row.first_name || "");
  const lastName = normalizeAlias(row.last_name || "");
  const fullName = normalizeAlias([row.alias, row.first_name, row.last_name].filter(Boolean).join(" "));
  const phone = normalizePhone(row.phone);
  const email = normalizeEmail(row.email);

  const nameMatch =
    !!searchAlias &&
    (alias.includes(searchAlias) ||
      firstName.includes(searchAlias) ||
      lastName.includes(searchAlias) ||
      fullName.includes(searchAlias));

  const phoneMatch =
    !!searchPhone &&
    !!phone &&
    (phone === searchPhone ||
      (searchPhone.length >= 3 && (phone.includes(searchPhone) || phone.endsWith(searchPhone))));

  const emailMatch = !!searchEmail && !!email && (email === searchEmail || email.includes(searchEmail));

  return nameMatch || phoneMatch || emailMatch;
}

export function formatMaskedCustomerIdentifier(input: {
  alias?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  fallbackId?: string | null;
}): string {
  const rawName = (
    input.alias?.trim() ||
    [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ") ||
    ""
  ).trim();
  const maskedName = rawName
    ? rawName
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => {
          if (part.length <= 1) return `${part.toUpperCase()}*`;
          return `${part[0]!.toUpperCase()}${"*".repeat(Math.min(3, Math.max(2, part.length - 1)))}`;
        })
        .join(" ")
    : "";

  const digits = normalizePhone(input.phone) ?? "";
  const maskedPhone = digits.length >= 4 ? `***-${digits.slice(-4)}` : "";

  if (maskedName && maskedPhone) {
    return `${maskedName} • ${maskedPhone}`;
  }
  if (maskedName) {
    return maskedName;
  }
  if (maskedPhone) {
    return `Customer • ${maskedPhone}`;
  }
  if (input.fallbackId) {
    const cleanId = String(input.fallbackId).replace(/[^A-Za-z0-9]/g, "");
    return `Cust #${cleanId.slice(-4).toUpperCase()}`;
  }
  return "Walk-in";
}

