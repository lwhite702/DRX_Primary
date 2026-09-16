import { z } from "zod";
import { PRIVACY_FIELDS } from "./types";

const fieldRule = z.object({ visible: z.boolean(), recommended: z.boolean() }).strict();
/** Validate an explicit policy; malformed input must never select a fallback. */
export const privacyProtocolSchema = z.object({
  profile: z.enum(["alias_mode", "standard_mode", "business_crm_mode"]),
  alias_only_mode: z.boolean(),
  fields: z.object({ alias: fieldRule, first_name: fieldRule, phone: fieldRule, email: fieldRule, address: fieldRule, notes: fieldRule }).strict(),
  retention: z.object({ enabled: z.boolean(), days: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), frequency: z.enum(["daily", "weekly"]), local_hour: z.number().int().min(0).max(23), hard_delete: z.boolean(), last_run_at: z.string().datetime().optional() }).strict(),
  screen_privacy: z.object({ mode: z.enum(["always_on", "pos_only", "manual"]), default_enabled: z.boolean() }).strict(),
  ephemeral_profiles: z.object({ enabled: z.boolean(), default_retention_days: z.union([z.literal(1), z.literal(7), z.literal(30)]), allow_in_standard_customer_create: z.boolean() }).strict(),
  inventory_monitoring: z.object({ enabled: z.boolean(), refresh_frequency: z.enum(["manual", "daily"]), last_snapshot_at: z.string().datetime().optional() }).strict(),
}).strict().superRefine((policy, ctx) => {
  for (const field of PRIVACY_FIELDS) {
    const rule = policy.fields[field];
    if ((rule.recommended && !rule.visible) || (policy.alias_only_mode && field !== "alias" && (rule.visible || rule.recommended))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fields", field], message: "Conflicting privacy field configuration" });
    }
  }
  if (policy.alias_only_mode && (!policy.fields.alias.visible || !policy.fields.alias.recommended)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fields", "alias"], message: "Alias must remain available in alias-only mode" });
  }
});
