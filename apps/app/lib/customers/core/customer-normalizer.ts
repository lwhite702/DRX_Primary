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
    credit_limit: 0,
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

  const alias = normalizeAlias(row.alias || row.first_name || row.last_name || "");
  const phone = normalizePhone(row.phone);
  const email = normalizeEmail(row.email);
  const lastName = normalizeAlias(row.last_name || "");

  return (
    (!!searchAlias && (alias.includes(searchAlias) || lastName.includes(searchAlias))) ||
    (!!searchPhone && phone === searchPhone) ||
    (!!searchEmail && email === searchEmail)
  );
}
