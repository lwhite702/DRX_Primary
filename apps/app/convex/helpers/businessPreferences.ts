import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { AuthenticatedUser } from "./auth";
import type { PrivacyProtocolSettings } from "../../lib/privacy/types";
import { privacyProtocolSchema } from "../../lib/privacy/protocol-schema";
import { requirePermission } from "./permissions";

export function settingsData(settings: Doc<"businessSettings"> | null): Record<string, unknown> {
  if (!settings?.settingsData) return {};
  try {
    const value: unknown = JSON.parse(settings.settingsData);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new Error("INVALID_STATE: Business settings require reconciliation"); }
}
export function configuredPin(settings: Doc<"businessSettings"> | null): string | undefined {
  if (settings?.posManagerPin !== undefined) return settings.posManagerPin.trim() || undefined;
  const data = settingsData(settings);
  const pins = [data.quick_pos_exit_pin, data.pos_manager_pin].filter(value => value !== undefined && value !== null && value !== "");
  if (pins.some(value => typeof value !== "string") || new Set(pins).size > 1) throw new Error("INVALID_STATE: Manager PIN requires reconciliation");
  return typeof pins[0] === "string" ? pins[0].trim() || undefined : undefined;
}
export function publicSettingsData(settings: Doc<"businessSettings">): string | undefined {
  if (!settings.settingsData) return undefined;
  const data = { ...settingsData(settings) };
  delete data.quick_pos_exit_pin; delete data.pos_manager_pin;
  return JSON.stringify(data);
}
export async function loadPrivacyPolicy(ctx: QueryCtx | MutationCtx, businessId: Id<"businesses">) {
  const policy = await ctx.db.query("businessPrivacyPolicies").withIndex("by_businessId", q => q.eq("businessId", businessId)).unique();
  if (!policy || !Number.isSafeInteger(policy.revision) || policy.revision < 0 || !privacyProtocolSchema.safeParse(policy.protocol).success) {
    throw new Error("INVALID_STATE: Business privacy policy requires reconciliation");
  }
  return policy;
}
export async function preferencesSnapshot(ctx: QueryCtx | MutationCtx, auth: AuthenticatedUser, includePrivacy = true) {
  const business = await ctx.db.get(auth.businessId);
  if (!business) throw new Error("NOT_FOUND: Business is unavailable");
  const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
  const policy = includePrivacy ? await loadPrivacyPolicy(ctx, auth.businessId) : null;
  return { collectTax: business.collectTax, taxRateBps: business.taxRateBps,
    hasPinConfigured: Boolean(configuredPin(settings)), privacyProtocol: policy?.protocol ?? null,
    privacyRevision: policy?.revision ?? null };
}
export type SettingsPatch = {
  name?: string; themePreference?: string; collectTax?: boolean; taxRateBps?: number;
  posManagerPin?: string | null; privacyProtocol?: PrivacyProtocolSettings; expectedPrivacyRevision?: number;
};
export async function saveBusinessPreferences(ctx: MutationCtx, auth: AuthenticatedUser, patch: SettingsPatch) {
  requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
  if (patch.taxRateBps !== undefined && (!Number.isSafeInteger(patch.taxRateBps) || patch.taxRateBps < 0 || patch.taxRateBps > 10000)) throw new Error("INVALID_ARGUMENT: Tax must be whole basis points between zero and 10000");
  if (patch.name !== undefined && (!patch.name.trim() || patch.name.trim().length > 255)) throw new Error("INVALID_ARGUMENT: Invalid business name");
  if (patch.themePreference !== undefined && !["dark", "light", "system"].includes(patch.themePreference)) throw new Error("INVALID_ARGUMENT: Invalid theme preference");
  const pin = patch.posManagerPin?.trim();
  if (pin && (pin.length < 4 || pin.length > 50 || pin === "••••")) throw new Error("INVALID_ARGUMENT: Invalid manager PIN");
  const now = Date.now();
  const changedFields: string[] = [];
  if (patch.privacyProtocol !== undefined) {
    const policy = await loadPrivacyPolicy(ctx, auth.businessId);
    const parsed = privacyProtocolSchema.safeParse(patch.privacyProtocol);
    if (!parsed.success) throw new Error("INVALID_ARGUMENT: Invalid privacy policy");
    if (patch.expectedPrivacyRevision !== undefined && patch.expectedPrivacyRevision !== policy.revision) throw new Error("CONFLICT: Privacy settings changed; reload before saving");
    const next = parsed.data;
    if ((next.retention.last_run_at !== undefined && next.retention.last_run_at !== policy.protocol.retention.last_run_at) ||
        (next.inventory_monitoring.last_snapshot_at !== undefined && next.inventory_monitoring.last_snapshot_at !== policy.protocol.inventory_monitoring.last_snapshot_at)) throw new Error("INVALID_ARGUMENT: Privacy job metadata is server-managed");
    if (policy.protocol.retention.last_run_at) next.retention.last_run_at = policy.protocol.retention.last_run_at;
    if (policy.protocol.inventory_monitoring.last_snapshot_at) next.inventory_monitoring.last_snapshot_at = policy.protocol.inventory_monitoring.last_snapshot_at;
    if (JSON.stringify(next) !== JSON.stringify(privacyProtocolSchema.parse(policy.protocol))) {
      if (!Number.isSafeInteger(policy.revision + 1)) throw new Error("INVALID_STATE: Privacy revision requires reconciliation");
      await ctx.db.patch(policy._id, { protocol: next, revision: policy.revision + 1, updatedAt: now, updatedBy: auth.userId });
      await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "privacy_policy_updated", entityType: "privacy_policy", entityId: auth.businessId,
        metadata: JSON.stringify({ revision: policy.revision + 1, privacy_protocol: next }), timestamp: now });
      changedFields.push("privacyProtocol");
    }
  } else if (patch.expectedPrivacyRevision !== undefined) throw new Error("INVALID_ARGUMENT: Privacy revision requires a policy");
  const businessPatch: Partial<Pick<Doc<"businesses">, "name" | "collectTax" | "taxRateBps" | "updatedAt">> = {};
  if (patch.name !== undefined && patch.name.trim() !== auth.businessRecord.name) businessPatch.name = patch.name.trim();
  if (patch.collectTax !== undefined && patch.collectTax !== auth.businessRecord.collectTax) businessPatch.collectTax = patch.collectTax;
  if (patch.taxRateBps !== undefined && patch.taxRateBps !== auth.businessRecord.taxRateBps) businessPatch.taxRateBps = patch.taxRateBps;
  if (Object.keys(businessPatch).length) {
    changedFields.push(...Object.keys(businessPatch));
    await ctx.db.patch(auth.businessId, { ...businessPatch, updatedAt: now });
  }
  if (patch.posManagerPin !== undefined || patch.themePreference !== undefined) {
    const existing = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    const settingPatch: Partial<Pick<Doc<"businessSettings">, "posManagerPin" | "settingsData" | "themePreference">> = {};
    if (patch.posManagerPin !== undefined) {
      const data = settingsData(existing);
      const oldPin = configuredPin(existing);
      if (oldPin !== (pin || undefined) || data.quick_pos_exit_pin !== undefined || data.pos_manager_pin !== undefined) {
        settingPatch.posManagerPin = pin || undefined;
        delete data.quick_pos_exit_pin; delete data.pos_manager_pin;
        settingPatch.settingsData = JSON.stringify(data);
        changedFields.push("posManagerPin");
      }
    }
    if (patch.themePreference !== undefined && patch.themePreference !== existing?.themePreference) {
      settingPatch.themePreference = patch.themePreference; changedFields.push("themePreference");
    }
    if (Object.keys(settingPatch).length) {
      if (existing) await ctx.db.patch(existing._id, { ...settingPatch, updatedAt: now });
      else await ctx.db.insert("businessSettings", { businessId: auth.businessId, ...settingPatch, createdAt: now, updatedAt: now });
    }
  }
  if (changedFields.length) await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "BUSINESS_SETTINGS_UPDATED", entityType: "business", entityId: auth.businessId, metadata: JSON.stringify({ changedFields }), timestamp: now });
}
