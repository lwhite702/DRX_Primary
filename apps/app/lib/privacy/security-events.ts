import { db } from "@/lib/db";

interface PrivacySecurityEventInput {
  action:
    | "privacy_vault_decrypt_failed"
    | "privacy_vault_key_unavailable"
    | "privacy_vault_invalid_payload";
  businessId?: string | null;
  customerId?: string | null;
  field?: string;
  route?: string;
  details?: Record<string, unknown>;
}

export async function logPrivacySecurityEvent(
  input: PrivacySecurityEventInput,
): Promise<void> {
  try {
    await db.systemAuditLog.create({
      data: {
        action: input.action,
        entityType: "privacy",
        entityId: input.customerId ?? null,
        businessId: input.businessId ?? null,
        newValues: {
          field: input.field ?? null,
          route: input.route ?? null,
          ...(input.details ?? {}),
        },
      },
    });
  } catch (error) {
    console.error("[privacy/security-event]", error);
  }
}
