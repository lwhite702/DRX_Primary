import { v } from "convex/values";

const fieldRule = v.object({ visible: v.boolean(), recommended: v.boolean() });
export const privacyProtocolValidator = v.object({
  profile: v.union(v.literal("alias_mode"), v.literal("standard_mode"), v.literal("business_crm_mode")),
  alias_only_mode: v.boolean(),
  fields: v.object({ alias: fieldRule, first_name: fieldRule, phone: fieldRule, email: fieldRule, address: fieldRule, notes: fieldRule }),
  retention: v.object({ enabled: v.boolean(), days: v.number(), frequency: v.union(v.literal("daily"), v.literal("weekly")), local_hour: v.number(), hard_delete: v.boolean(), last_run_at: v.optional(v.string()) }),
  screen_privacy: v.object({ mode: v.union(v.literal("always_on"), v.literal("pos_only"), v.literal("manual")), default_enabled: v.boolean() }),
  ephemeral_profiles: v.object({ enabled: v.boolean(), default_retention_days: v.union(v.literal(1), v.literal(7), v.literal(30)), allow_in_standard_customer_create: v.boolean() }),
  inventory_monitoring: v.object({ enabled: v.boolean(), refresh_frequency: v.union(v.literal("manual"), v.literal("daily")), last_snapshot_at: v.optional(v.string()) }),
});
