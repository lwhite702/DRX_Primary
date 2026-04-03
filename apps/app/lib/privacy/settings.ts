import {
  getDefaultPrivacyProtocol,
  normalizePrivacyProtocol,
} from "@/lib/privacy/profiles";
import type {
  PrivacyProfile,
  PrivacyProtocolSettings,
} from "@/lib/privacy/types";

function mapLegacyPresetToProfile(value: unknown): PrivacyProfile {
  const preset = typeof value === "string" ? value.toLowerCase() : "";

  if (preset === "open") return "business_crm_mode";
  if (preset === "balanced") return "standard_mode";
  if (preset === "private" || preset === "max_secure") return "alias_mode";

  return "standard_mode";
}

export function extractPrivacyProtocol(
  settingsData: unknown,
): PrivacyProtocolSettings {
  if (!settingsData || typeof settingsData !== "object") {
    return getDefaultPrivacyProtocol("standard_mode");
  }

  const bag = settingsData as Record<string, unknown>;

  if (bag.privacy_protocol) {
    return normalizePrivacyProtocol(bag.privacy_protocol);
  }

  return getDefaultPrivacyProtocol(
    mapLegacyPresetToProfile(bag.privacy_preset),
  );
}

export function withPrivacyProtocol(
  settingsData: unknown,
  privacyProtocol: PrivacyProtocolSettings,
): Record<string, unknown> {
  const base =
    settingsData && typeof settingsData === "object"
      ? { ...(settingsData as Record<string, unknown>) }
      : {};

  base.privacy_protocol = privacyProtocol;
  base.privacy_preset = privacyProtocol.profile;

  return base;
}
