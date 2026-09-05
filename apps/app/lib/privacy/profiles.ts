import {
  PRIVACY_FIELDS,
  type InventoryRefreshFrequency,
  type PrivacyField,
  type PrivacyFieldConfig,
  type PrivacyProfile,
  type PrivacyProtocolSettings,
  type ScreenPrivacyMode,
  type PrivacyRetentionSettings,
} from "@/lib/privacy/types";
import { drxCopy } from "@/lib/copy/drx";

const DEFAULT_RETENTION: Omit<PrivacyRetentionSettings, "days"> = {
  enabled: true,
  frequency: "daily",
  local_hour: 2,
  hard_delete: true,
};

const DEFAULT_SCREEN_PRIVACY: PrivacyProtocolSettings["screen_privacy"] = {
  mode: "manual",
  default_enabled: false,
};

const DEFAULT_EPHEMERAL_PROFILES: PrivacyProtocolSettings["ephemeral_profiles"] = {
  enabled: true,
  default_retention_days: 7,
  allow_in_standard_customer_create: false,
};

const DEFAULT_INVENTORY_MONITORING: PrivacyProtocolSettings["inventory_monitoring"] = {
  enabled: true,
  refresh_frequency: "daily",
};

function buildFieldConfig(
  visible: PrivacyField[],
  recommended: PrivacyField[],
): PrivacyFieldConfig {
  return PRIVACY_FIELDS.reduce((acc, field) => {
    acc[field] = {
      visible: visible.includes(field),
      recommended: recommended.includes(field),
    };
    return acc;
  }, {} as PrivacyFieldConfig);
}

const PROFILE_DEFAULTS: Record<PrivacyProfile, PrivacyProtocolSettings> = {
  alias_mode: {
    profile: "alias_mode",
    alias_only_mode: true,
    fields: buildFieldConfig(["alias"], ["alias"]),
    retention: {
      ...DEFAULT_RETENTION,
      days: 30,
    },
    screen_privacy: { ...DEFAULT_SCREEN_PRIVACY },
    ephemeral_profiles: { ...DEFAULT_EPHEMERAL_PROFILES },
    inventory_monitoring: { ...DEFAULT_INVENTORY_MONITORING },
  },
  standard_mode: {
    profile: "standard_mode",
    alias_only_mode: false,
    fields: buildFieldConfig(
      ["alias", "first_name", "phone", "email"],
      ["alias", "first_name", "phone"],
    ),
    retention: {
      ...DEFAULT_RETENTION,
      days: 180,
    },
    screen_privacy: { ...DEFAULT_SCREEN_PRIVACY },
    ephemeral_profiles: { ...DEFAULT_EPHEMERAL_PROFILES },
    inventory_monitoring: { ...DEFAULT_INVENTORY_MONITORING },
  },
  business_crm_mode: {
    profile: "business_crm_mode",
    alias_only_mode: false,
    fields: buildFieldConfig(
      ["alias", "first_name", "phone", "email", "address", "notes"],
      ["alias", "first_name", "phone", "email", "address"],
    ),
    retention: {
      ...DEFAULT_RETENTION,
      days: 365,
    },
    screen_privacy: { ...DEFAULT_SCREEN_PRIVACY },
    ephemeral_profiles: { ...DEFAULT_EPHEMERAL_PROFILES },
    inventory_monitoring: { ...DEFAULT_INVENTORY_MONITORING },
  },
};

const privacyPresetCopy = drxCopy.onboarding.privacy.presets;

export const PRIVACY_PROFILE_OPTIONS: Array<{
  id: PrivacyProfile;
  label: string;
  description: string;
}> = [
  {
    id: "alias_mode",
    label: privacyPresetCopy.aliasMode.label,
    description: privacyPresetCopy.aliasMode.desc,
  },
  {
    id: "standard_mode",
    label: privacyPresetCopy.standardMode.label,
    description: privacyPresetCopy.standardMode.desc,
  },
  {
    id: "business_crm_mode",
    label: privacyPresetCopy.businessCrmMode.label,
    description: privacyPresetCopy.businessCrmMode.desc,
  },
];

function cloneProtocol(settings: PrivacyProtocolSettings): PrivacyProtocolSettings {
  return {
    profile: settings.profile,
    alias_only_mode: settings.alias_only_mode,
    fields: { ...settings.fields },
    retention: { ...settings.retention },
    screen_privacy: { ...settings.screen_privacy },
    ephemeral_profiles: { ...settings.ephemeral_profiles },
    inventory_monitoring: { ...settings.inventory_monitoring },
  };
}

export function getDefaultPrivacyProtocol(
  profile: PrivacyProfile = "standard_mode",
): PrivacyProtocolSettings {
  return cloneProtocol(PROFILE_DEFAULTS[profile]);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function isScreenPrivacyMode(value: unknown): value is ScreenPrivacyMode {
  return value === "always_on" || value === "pos_only" || value === "manual";
}

function isInventoryRefreshFrequency(
  value: unknown,
): value is InventoryRefreshFrequency {
  return value === "manual" || value === "daily";
}

function isPrivacyProfile(value: unknown): value is PrivacyProfile {
  return (
    value === "alias_mode" ||
    value === "standard_mode" ||
    value === "business_crm_mode"
  );
}

export function normalizePrivacyProtocol(
  maybeSettings: unknown,
  fallbackProfile: PrivacyProfile = "standard_mode",
): PrivacyProtocolSettings {
  const base = getDefaultPrivacyProtocol(fallbackProfile);

  if (!maybeSettings || typeof maybeSettings !== "object") {
    return base;
  }

  const candidate = maybeSettings as Partial<PrivacyProtocolSettings>;
  const profile = isPrivacyProfile(candidate.profile)
    ? candidate.profile
    : fallbackProfile;

  const merged = getDefaultPrivacyProtocol(profile);

  if (candidate.fields && typeof candidate.fields === "object") {
    for (const field of PRIVACY_FIELDS) {
      const rule = (candidate.fields as Partial<PrivacyFieldConfig>)[field];
      if (rule && typeof rule === "object") {
        merged.fields[field] = {
          visible: toBoolean(rule.visible, merged.fields[field].visible),
          recommended: toBoolean(
            rule.recommended,
            merged.fields[field].recommended,
          ),
        };
      }
    }
  }

  if (candidate.retention && typeof candidate.retention === "object") {
    const retention = candidate.retention as Partial<PrivacyRetentionSettings>;
    merged.retention = {
      ...merged.retention,
      enabled: toBoolean(retention.enabled, merged.retention.enabled),
      days: Math.max(1, toInt(retention.days, merged.retention.days)),
      frequency:
        retention.frequency === "weekly" || retention.frequency === "daily"
          ? retention.frequency
          : merged.retention.frequency,
      local_hour: Math.min(
        23,
        Math.max(0, toInt(retention.local_hour, merged.retention.local_hour)),
      ),
      hard_delete: toBoolean(retention.hard_delete, merged.retention.hard_delete),
      last_run_at:
        typeof retention.last_run_at === "string"
          ? retention.last_run_at
          : merged.retention.last_run_at,
    };
  }

  if (
    candidate.screen_privacy &&
    typeof candidate.screen_privacy === "object"
  ) {
    const screenPrivacy = candidate.screen_privacy as Partial<
      PrivacyProtocolSettings["screen_privacy"]
    >;
    merged.screen_privacy = {
      mode: isScreenPrivacyMode(screenPrivacy.mode)
        ? screenPrivacy.mode
        : merged.screen_privacy.mode,
      default_enabled: toBoolean(
        screenPrivacy.default_enabled,
        merged.screen_privacy.default_enabled,
      ),
    };
  }

  if (
    candidate.ephemeral_profiles &&
    typeof candidate.ephemeral_profiles === "object"
  ) {
    const ephemeralProfiles = candidate.ephemeral_profiles as Partial<
      PrivacyProtocolSettings["ephemeral_profiles"]
    >;
    const defaultRetentionDays = toInt(
      ephemeralProfiles.default_retention_days,
      merged.ephemeral_profiles.default_retention_days,
    );
    merged.ephemeral_profiles = {
      enabled: toBoolean(
        ephemeralProfiles.enabled,
        merged.ephemeral_profiles.enabled,
      ),
      default_retention_days:
        defaultRetentionDays === 1 ||
        defaultRetentionDays === 7 ||
        defaultRetentionDays === 30
          ? defaultRetentionDays
          : merged.ephemeral_profiles.default_retention_days,
      allow_in_standard_customer_create: toBoolean(
        ephemeralProfiles.allow_in_standard_customer_create,
        merged.ephemeral_profiles.allow_in_standard_customer_create,
      ),
    };
  }

  if (
    candidate.inventory_monitoring &&
    typeof candidate.inventory_monitoring === "object"
  ) {
    const inventoryMonitoring = candidate.inventory_monitoring as Partial<
      PrivacyProtocolSettings["inventory_monitoring"]
    >;
    merged.inventory_monitoring = {
      enabled: toBoolean(
        inventoryMonitoring.enabled,
        merged.inventory_monitoring.enabled,
      ),
      refresh_frequency: isInventoryRefreshFrequency(
        inventoryMonitoring.refresh_frequency,
      )
        ? inventoryMonitoring.refresh_frequency
        : merged.inventory_monitoring.refresh_frequency,
      last_snapshot_at:
        typeof inventoryMonitoring.last_snapshot_at === "string"
          ? inventoryMonitoring.last_snapshot_at
          : merged.inventory_monitoring.last_snapshot_at,
    };
  }

  merged.alias_only_mode = toBoolean(
    candidate.alias_only_mode,
    merged.alias_only_mode,
  );

  if (merged.alias_only_mode) {
    for (const field of PRIVACY_FIELDS) {
      if (field !== "alias") {
        merged.fields[field] = {
          visible: false,
          recommended: false,
        };
      }
    }
    merged.fields.alias = { visible: true, recommended: true };
  }

  return merged;
}

export function canWritePrivacyField(
  settings: PrivacyProtocolSettings,
  field: PrivacyField,
): boolean {
  if (settings.alias_only_mode && field !== "alias") {
    return false;
  }
  return settings.fields[field]?.visible ?? false;
}

export function getRecommendedPrivacyFields(
  settings: PrivacyProtocolSettings,
): PrivacyField[] {
  return PRIVACY_FIELDS.filter((field) => settings.fields[field].recommended);
}
