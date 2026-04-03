import { describe, expect, it } from "vitest";

import {
  canWritePrivacyField,
  getDefaultPrivacyProtocol,
  normalizePrivacyProtocol,
} from "@/lib/privacy/profiles";

describe("privacy profiles", () => {
  it("applies locked defaults for alias mode", () => {
    const protocol = getDefaultPrivacyProtocol("alias_mode");

    expect(protocol.alias_only_mode).toBe(true);
    expect(protocol.retention.days).toBe(30);
    expect(protocol.fields.alias.visible).toBe(true);
    expect(protocol.fields.phone.visible).toBe(false);
    expect(protocol.screen_privacy.mode).toBe("manual");
    expect(protocol.ephemeral_profiles.default_retention_days).toBe(7);
    expect(protocol.inventory_monitoring.refresh_frequency).toBe("daily");
  });

  it("applies locked defaults for standard mode", () => {
    const protocol = getDefaultPrivacyProtocol("standard_mode");

    expect(protocol.alias_only_mode).toBe(false);
    expect(protocol.retention.days).toBe(180);
    expect(protocol.fields.alias.visible).toBe(true);
    expect(protocol.fields.address.visible).toBe(false);
  });

  it("applies locked defaults for business crm mode", () => {
    const protocol = getDefaultPrivacyProtocol("business_crm_mode");

    expect(protocol.alias_only_mode).toBe(false);
    expect(protocol.retention.days).toBe(365);
    expect(protocol.fields.address.visible).toBe(true);
    expect(protocol.fields.notes.visible).toBe(true);
  });

  it("enforces alias-only when normalized from overrides", () => {
    const protocol = normalizePrivacyProtocol({
      profile: "standard_mode",
      alias_only_mode: true,
      fields: {
        phone: { visible: true, recommended: true },
      },
    });

    expect(protocol.fields.alias.visible).toBe(true);
    expect(protocol.fields.phone.visible).toBe(false);
    expect(canWritePrivacyField(protocol, "alias")).toBe(true);
    expect(canWritePrivacyField(protocol, "email")).toBe(false);
  });

  it("normalizes extended privacy controls", () => {
    const protocol = normalizePrivacyProtocol({
      profile: "business_crm_mode",
      screen_privacy: { mode: "always_on", default_enabled: true },
      ephemeral_profiles: {
        enabled: true,
        default_retention_days: 30,
        allow_in_standard_customer_create: true,
      },
      inventory_monitoring: {
        enabled: true,
        refresh_frequency: "manual",
      },
    });

    expect(protocol.screen_privacy.mode).toBe("always_on");
    expect(protocol.screen_privacy.default_enabled).toBe(true);
    expect(protocol.ephemeral_profiles.default_retention_days).toBe(30);
    expect(protocol.ephemeral_profiles.allow_in_standard_customer_create).toBe(
      true,
    );
    expect(protocol.inventory_monitoring.refresh_frequency).toBe("manual");
  });
});
