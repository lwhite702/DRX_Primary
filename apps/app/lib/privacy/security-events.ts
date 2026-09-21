import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

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
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    const token = await getConvexAuthToken();
    if (!url || !token || !input.businessId) return;
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    await client.mutation(api.audit.logPrivacySecurityEvent, {
      businessId: input.businessId,
      customerId: input.customerId ?? null,
      action: input.action,
      field: input.field ?? null,
      details: JSON.stringify({ route: input.route ?? null, ...(input.details ?? {}) }),
    });
  } catch (error) {
    console.error("[privacy/security-event]", error);
  }
}
