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
    privacy_protocol: z.unknown().optional(),
    privacyProtocol: z.unknown().optional(),
    defaultTaxRate: z.number().min(0).max(1).optional(),
    default_tax_rate: z.number().min(0).max(1).optional(),
  })
  .strict();

function mapSettingsResponse(settings: any) {
  const protocol = extractPrivacyProtocol(settings?.settingsData);
  return {
    collect_tax: settings?.collectTax ?? true,
    collectTax: settings?.collectTax ?? true,
    default_tax_rate: Number(settings?.defaultTaxRate ?? 0.08),
    defaultTaxRate: Number(settings?.defaultTaxRate ?? 0.08),
    pos_manager_pin: settings?.posManagerPin ?? null,
    posManagerPin: settings?.posManagerPin ?? null,
    privacy_protocol: protocol,
    privacyProtocol: protocol,
  };
}

function mapLegacySettingsResponse(settings: any) {
  return {
    collect_tax: settings?.collectTax ?? true,
    collectTax: settings?.collectTax ?? true,
    default_tax_rate: Number(settings?.defaultTaxRate ?? 0.08),
    defaultTaxRate: Number(settings?.defaultTaxRate ?? 0.08),
    pos_manager_pin: settings?.posManagerPin ?? null,
    posManagerPin: settings?.posManagerPin ?? null,
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

    const settings = await db.businessSettings.findFirst({
      where: { businessId },
    });

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

    const baseUpdate = await db.businessSettings.upsert({
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

    const nextProtocolCandidate =
      parsed.data.privacy_protocol ?? parsed.data.privacyProtocol;

    if (privacySettingsEnabled && nextProtocolCandidate !== undefined) {
      await updateBusinessPrivacyPolicy({
        businessId,
        userId,
        nextPolicy: normalizePrivacyPolicy(nextProtocolCandidate),
      });
    }

    const refreshed = await db.businessSettings.findFirst({
      where: { businessId },
    });

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
