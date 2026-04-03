export const PRIVACY_FIELDS = [
  "alias",
  "first_name",
  "phone",
  "email",
  "address",
  "notes",
] as const;

export type PrivacyField = (typeof PRIVACY_FIELDS)[number];

export type PrivacyProfile =
  | "alias_mode"
  | "standard_mode"
  | "business_crm_mode";

export type PrivacyRetentionFrequency = "daily" | "weekly";
export type ScreenPrivacyMode = "always_on" | "pos_only" | "manual";
export type InventoryRefreshFrequency = "manual" | "daily";

export type PrivacyFieldConfig = Record<
  PrivacyField,
  {
    visible: boolean;
    recommended: boolean;
  }
>;

export interface PrivacyRetentionSettings {
  enabled: boolean;
  days: number;
  frequency: PrivacyRetentionFrequency;
  local_hour: number;
  hard_delete: boolean;
  last_run_at?: string;
}

export interface PrivacyScreenPrivacySettings {
  mode: ScreenPrivacyMode;
  default_enabled: boolean;
}

export interface PrivacyEphemeralProfileSettings {
  enabled: boolean;
  default_retention_days: 1 | 7 | 30;
  allow_in_standard_customer_create: boolean;
}

export interface PrivacyInventoryMonitoringSettings {
  enabled: boolean;
  refresh_frequency: InventoryRefreshFrequency;
  last_snapshot_at?: string;
}

export interface PrivacyProtocolSettings {
  profile: PrivacyProfile;
  alias_only_mode: boolean;
  fields: PrivacyFieldConfig;
  retention: PrivacyRetentionSettings;
  screen_privacy: PrivacyScreenPrivacySettings;
  ephemeral_profiles: PrivacyEphemeralProfileSettings;
  inventory_monitoring: PrivacyInventoryMonitoringSettings;
}

export const PRIVACY_PROTOCOL_VERSION = 1;
