import {
  canWritePrivacyField,
  getDefaultPrivacyProtocol,
  normalizePrivacyProtocol,
} from "@/lib/privacy/profiles";
import type {
  PrivacyField,
  PrivacyProfile,
  PrivacyProtocolSettings,
} from "@/lib/privacy/types";

export const PRIVACY_RESOLUTION_ORDER = [
  "system_baseline",
  "tenant_default_profile",
  "tenant_preferences",
  "role_override",
  "request_constraints",
] as const;

export type PrivacyResolutionLayer = (typeof PRIVACY_RESOLUTION_ORDER)[number];

export function getBaselinePrivacyPolicy(
  profile: PrivacyProfile = "standard_mode",
): PrivacyProtocolSettings {
  return getDefaultPrivacyProtocol(profile);
}

export function normalizePrivacyPolicy(
  value: unknown,
  fallback: PrivacyProfile = "standard_mode",
): PrivacyProtocolSettings {
  return normalizePrivacyProtocol(value, fallback);
}

export function canWriteField(
  policy: PrivacyProtocolSettings,
  field: PrivacyField,
): boolean {
  return canWritePrivacyField(policy, field);
}
