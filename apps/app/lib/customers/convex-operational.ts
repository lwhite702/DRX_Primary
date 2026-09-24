import { NextResponse } from "next/server";
import { decodeCustomerPii, type CustomerPiiStorage } from "@/lib/privacy/customer-pii";
import { mapCustomerToOperationalModel } from "@/lib/customers/core/customer-normalizer";

export function optionalEncrypted(value: string | null): string | null {
  return value?.trim() || null;
}

export function dollarsToCents(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  const cents = Math.round(number * 100);
  if (!Number.isFinite(number) || !Number.isSafeInteger(cents) || cents < 0 || Math.abs(number * 100 - cents) > 1e-6) {
    throw new Error(`INVALID_ARGUMENT: ${label} must have at most two decimal places`);
  }
  return cents;
}

export function convexPiiArgs(storage: CustomerPiiStorage) {
  return {
    aliasEncrypted: optionalEncrypted(storage.aliasEncrypted),
    firstNameEncrypted: optionalEncrypted(storage.firstNameEncrypted),
    phoneEncrypted: optionalEncrypted(storage.phoneEncrypted),
    emailEncrypted: optionalEncrypted(storage.emailEncrypted),
    addressEncrypted: optionalEncrypted(storage.addressEncrypted),
    notesEncrypted: optionalEncrypted(storage.notesEncrypted),
    aliasHash: optionalEncrypted(storage.aliasHash),
    phoneHash: optionalEncrypted(storage.phoneHash),
    emailHash: optionalEncrypted(storage.emailHash),
    piiEncryptionVersion: storage.piiEncryptionVersion,
  };
}

export async function mapConvexCustomer(customer: Record<string, any>, metrics?: unknown) {
  const id = String(customer._id ?? customer.id);
  const businessId = String(customer.businessId);
  const pii = await decodeCustomerPii({ ...customer, id, businessId });
  const model = mapCustomerToOperationalModel(
    {
      ...customer,
      id,
      businessId,
      totalPurchases: customer.totalPurchasesCents / 100,
      totalCreditUsed: customer.totalCreditUsedCents / 100,
      fixedPricePerGram: customer.fixedPricePerGramCents === undefined ? null : customer.fixedPricePerGramCents / 100,
      creditLimits: [{ maxCreditLimit: customer.creditLimitCents / 100 }],
      ephemeral: customer.ephemeral ?? false,
      ephemeralExpiresAt: customer.ephemeralExpiresAt ? new Date(customer.ephemeralExpiresAt).toISOString() : null,
      lastActivityAt: new Date(customer.lastActivityAt ?? customer.updatedAt).toISOString(),
      createdAt: new Date(customer.createdAt).toISOString(),
      updatedAt: new Date(customer.updatedAt).toISOString(),
    },
    pii,
  );
  return metrics === undefined ? model : { ...model, metrics };
}

export function customerFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const conflict = message.match(/CONFLICT:\s*([^\s]+)/);
  if (conflict) {
    return NextResponse.json({ error: "A customer with that phone or email already exists", existing_customer_id: conflict[1] }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  }
  const match = [
    ["UNAUTH", 401, "Unauthorized"],
    ["FORBIDDEN:", 403, "Access denied"],
    ["NOT_FOUND:", 404, "Customer not found"],
    ["INVALID_ARGUMENT:", 400, "Invalid customer data"],
    ["INVALID_STATE:", 409, "Customer data requires reconciliation"],
    ["CAPACITY_EXCEEDED:", 503, "Customer history exceeds the current processing limit"],
    ["UNAVAILABLE:", 503, "Customer service is temporarily unavailable"],
  ] as const;
  const known = match.find(([code]) => message.includes(code));
  return NextResponse.json({ error: known?.[2] ?? "Customer service is temporarily unavailable" }, { status: known?.[1] ?? 503, headers: { "Cache-Control": "private, no-store" } });
}
