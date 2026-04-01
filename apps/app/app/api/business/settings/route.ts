import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";
import {
  getDefaultPrivacyProtocol,
  normalizePrivacyProtocol,
} from "@/lib/privacy/profiles";
import {
  extractPrivacyProtocol,
  withPrivacyProtocol,
} from "@/lib/privacy/settings";

export async function GET() {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await (db.businessSettings as any).findFirst({
      where: { businessId },
    });

    const settingsData =
      settings?.settingsData && typeof settings.settingsData === "object"
        ? (settings.settingsData as Record<string, unknown>)
        : {};
    const privacyProtocol = extractPrivacyProtocol(settingsData);
    const defaultTaxRate =
      (typeof settingsData.default_tax_rate === "number"
        ? settingsData.default_tax_rate
        : typeof settingsData.defaultTaxRate === "number"
          ? settingsData.defaultTaxRate
          : 0) || 0;

    return NextResponse.json({
      collect_tax: settings?.collectTax ?? true,
      collectTax: settings?.collectTax ?? true,
      pos_manager_pin: settings?.posManagerPin ?? "1234",
      posManagerPin: settings?.posManagerPin ?? "1234",
      default_tax_rate: defaultTaxRate,
      defaultTaxRate: defaultTaxRate,
      privacy_protocol: privacyProtocol,
      privacyProtocol: privacyProtocol,
    });
  } catch (error) {
    console.error("GET Business Settings Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const existing = await db.businessSettings.findFirst({
      where: { businessId },
      select: {
        settingsData: true,
      },
    });
    const currentSettingsData =
      existing?.settingsData && typeof existing.settingsData === "object"
        ? (existing.settingsData as Record<string, unknown>)
        : {};

    const collectTax =
      typeof body.collect_tax === "boolean"
        ? body.collect_tax
        : typeof body.collectTax === "boolean"
          ? body.collectTax
          : undefined;
    const posManagerPin =
      typeof body.pos_manager_pin === "string"
        ? body.pos_manager_pin
        : typeof body.posManagerPin === "string"
          ? body.posManagerPin
          : undefined;
    const defaultTaxRate =
      typeof body.default_tax_rate === "number"
        ? body.default_tax_rate
        : typeof body.defaultTaxRate === "number"
          ? body.defaultTaxRate
          : undefined;
    const incomingPrivacy =
      body.privacy_protocol ?? body.privacyProtocol ?? undefined;
    const resolvedPrivacyProtocol = incomingPrivacy
      ? normalizePrivacyProtocol(incomingPrivacy)
      : extractPrivacyProtocol(currentSettingsData);

    const nextSettingsData: Record<string, unknown> = {
      ...currentSettingsData,
    };

    if (typeof defaultTaxRate === "number" && Number.isFinite(defaultTaxRate)) {
      nextSettingsData.default_tax_rate = defaultTaxRate;
      nextSettingsData.defaultTaxRate = defaultTaxRate;
    }

    const mergedSettingsData = withPrivacyProtocol(
      nextSettingsData,
      resolvedPrivacyProtocol || getDefaultPrivacyProtocol("standard_mode"),
    );

    const updated = await (db.businessSettings as any).upsert({
      where: { businessId },
      update: {
        collectTax: collectTax ?? undefined,
        posManagerPin: posManagerPin ?? undefined,
        settingsData: mergedSettingsData,
      },
      create: {
        businessId,
        collectTax: collectTax ?? true,
        posManagerPin: posManagerPin ?? "1234",
        settingsData: mergedSettingsData,
      },
    });

    return NextResponse.json({
      collect_tax: updated.collectTax ?? true,
      collectTax: updated.collectTax ?? true,
      pos_manager_pin: updated.posManagerPin ?? "1234",
      posManagerPin: updated.posManagerPin ?? "1234",
      default_tax_rate:
        (mergedSettingsData.default_tax_rate as number | undefined) ?? 0,
      defaultTaxRate:
        (mergedSettingsData.defaultTaxRate as number | undefined) ?? 0,
      privacy_protocol: extractPrivacyProtocol(mergedSettingsData),
      privacyProtocol: extractPrivacyProtocol(mergedSettingsData),
    });
  } catch (error) {
    console.error("PATCH Business Settings Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
