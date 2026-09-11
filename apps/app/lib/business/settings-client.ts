import { z } from "zod";
import { privacyProtocolSchema } from "@/lib/privacy/protocol-schema";

export const businessSettingsResponseSchema = z.object({
  collectTax: z.boolean(), defaultTaxRate: z.number().min(0).max(1),
  posManagerPinConfigured: z.boolean(), privacySettingsEnabled: z.boolean(),
  privacyProtocol: privacyProtocolSchema.nullable().optional(),
  privacyRevision: z.number().int().nonnegative().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.privacySettingsEnabled && (!data.privacyProtocol || data.privacyRevision == null)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Privacy settings are unavailable" });
});

export function pinUpdate(value: string, dirty: boolean) {
  return dirty ? { posManagerPin: value.trim() || null } : {};
}
