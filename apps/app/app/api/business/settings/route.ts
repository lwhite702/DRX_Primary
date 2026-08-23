import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/server-guards";
import { errorResponse, successResponse } from "@/lib/api/response";
import { extractPrivacyProtocol } from "@/lib/privacy/settings";
import { normalizePrivacyPolicy } from "@/lib/privacy/privacy-policy";
import { updateBusinessPrivacyPolicy } from "@/lib/privacy/privacy-resolution";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

const BusinessSettingsPatchSchema = z
  .object({
    collect_tax: z.boolean().optional(),
    collectTax: z.boolean().optional(),
    pos_manager_pin: z.string().trim().min(4).max(50).optional().nullable(),
    posManagerPin: z.string().trim().min(4).max(50).optional().nullable(),
    privacy_protocol: z.enum(["Standard", "Protexion", "Strict"]).optional(),
    privacyProtocol: z.enum(["Standard", "Protexion", "Strict"]).optional(),
    defaultTaxRate: z.number().min(0).max(1).optional(),
    default_tax_rate: z.number().min(0).max(1).optional(),
  })
  .strict();

function mapSettingsResponse(settings: any) {
  const protocol = extractPrivacyProtocol(settings?.settingsData);
  const data =
    settings?.settingsData && typeof settings.settingsData === "object"
      ? (settings.settingsData as Record<string, unknown>)
      : {};
  return {
    collect_tax: settings?.collectTax ?? (data.collect_tax as boolean) ?? true,
    collectTax: settings?.collectTax ?? (data.collect_tax as boolean) ?? true,
    default_tax_rate: Number(settings?.defaultTaxRate ?? data.default_tax_rate ?? 0.08),
    defaultTaxRate: Number(settings?.defaultTaxRate ?? data.default_tax_rate ?? 0.08),
    pos_manager_pin: (settings?.posManagerPin ?? data.pos_manager_pin ?? null) as string | null,
    posManagerPin: (settings?.posManagerPin ?? data.pos_manager_pin ?? null) as string | null,
    privacy_protocol: protocol,
    privacyProtocol: protocol,
  };
}

function mapLegacySettingsResponse(settings: any) {
  const data =
    settings?.settingsData && typeof settings.settingsData === "object"
      ? (settings.settingsData as Record<string, unknown>)
      : {};
  return {
    collect_tax: settings?.collectTax ?? (data.collect_tax as boolean) ?? true,
    collectTax: settings?.collectTax ?? (data.collect_tax as boolean) ?? true,
    default_tax_rate: Number(settings?.defaultTaxRate ?? data.default_tax_rate ?? 0.08),
    defaultTaxRate: Number(settings?.defaultTaxRate ?? data.default_tax_rate ?? 0.08),
    pos_manager_pin: (settings?.posManagerPin ?? data.pos_manager_pin ?? null) as string | null,
    posManagerPin: (settings?.posManagerPin ?? data.pos_manager_pin ?? null) as string | null,
  };
}

export async function GET() {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const privacySettingsEnabled = await ensureServerFlag(
      "feat_privacy_settings_v2",
      {
        distinctId: userId ?? businessId,
        groups: { business: businessId },
        defaultValue: true,
      },
    );

    let settings: any = null;
    try {
      settings = await db.businessSettings.findFirst({
        where: { businessId },
      });
    } catch (err) {
      console.warn("GET Business Settings fallback to settingsData:", err);
      try {
        settings = await db.businessSettings.findFirst({
          where: { businessId },
          select: { id: true, businessId: true, settingsData: true },
        });
      } catch {
        settings = null;
      }
    }

    if (!settings) {
      return successResponse(
        privacySettingsEnabled
          ? mapSettingsResponse(null)
          : mapLegacySettingsResponse(null),
      );
    }

    return successResponse(
      privacySettingsEnabled
        ? mapSettingsResponse(settings)
        : mapLegacySettingsResponse(settings),
    );
  } catch (error) {
    console.error("GET Business Settings Error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const canConfigure = await hasPermission("settings.configure_pos");
    if (!canConfigure) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const privacySettingsEnabled = await ensureServerFlag(
      "feat_privacy_settings_v2",
      {
        distinctId: userId ?? businessId,
        groups: { business: businessId },
        defaultValue: true,
      },
    );

    const parsed = BusinessSettingsPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid settings payload",
        400,
        parsed.error.flatten(),
      );
    }

    const collectTax = parsed.data.collect_tax ?? parsed.data.collectTax;
    const defaultTaxRate =
      parsed.data.default_tax_rate ?? parsed.data.defaultTaxRate;
    const posManagerPin =
      parsed.data.pos_manager_pin !== undefined
        ? parsed.data.pos_manager_pin
        : parsed.data.posManagerPin;

    let baseUpdate: any = null;
    try {
      baseUpdate = await db.businessSettings.upsert({
        where: { businessId },
        update: {
          collectTax: collectTax ?? undefined,
          defaultTaxRate: defaultTaxRate ?? undefined,
          posManagerPin: posManagerPin ?? undefined,
        },
        create: {
          businessId,
          collectTax: collectTax ?? true,
          defaultTaxRate: defaultTaxRate ?? 0.08,
          posManagerPin: posManagerPin ?? null,
        },
      });
    } catch (err) {
      console.warn("PATCH Business Settings fallback to settingsData:", err);
      const existing = await db.businessSettings.findUnique({
        where: { businessId },
        select: { id: true, settingsData: true },
      });
      const existingData =
        existing?.settingsData && typeof existing.settingsData === "object"
          ? (existing.settingsData as Record<string, unknown>)
          : {};
      const updatedData = {
        ...existingData,
        ...(collectTax !== undefined && { collect_tax: collectTax }),
        ...(defaultTaxRate !== undefined && { default_tax_rate: defaultTaxRate }),
        ...(posManagerPin !== undefined && { pos_manager_pin: posManagerPin }),
      };
      if (existing) {
        baseUpdate = await db.businessSettings.update({
          where: { id: existing.id },
          data: { settingsData: updatedData },
        });
      } else {
        baseUpdate = await db.businessSettings.create({
          data: { businessId, settingsData: updatedData },
        });
      }
    }

    const nextProtocolCandidate =
      parsed.data.privacy_protocol ?? parsed.data.privacyProtocol;

    if (privacySettingsEnabled && nextProtocolCandidate !== undefined) {
      await updateBusinessPrivacyPolicy({
        businessId,
        userId,
        nextPolicy: normalizePrivacyPolicy(nextProtocolCandidate),
      });
    }

    let refreshed: any = null;
    try {
      refreshed = await db.businessSettings.findFirst({
        where: { businessId },
      });
    } catch {
      refreshed = baseUpdate;
    }

    return successResponse({
      ...(privacySettingsEnabled
        ? mapSettingsResponse(refreshed || baseUpdate)
        : mapLegacySettingsResponse(refreshed || baseUpdate)),
      data: refreshed || baseUpdate,
    });
  } catch (error) {
    console.error("PATCH Business Settings Error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}
