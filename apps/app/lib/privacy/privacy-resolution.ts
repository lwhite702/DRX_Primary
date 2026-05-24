import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { extractPrivacyProtocol, withPrivacyProtocol } from "@/lib/privacy/settings";
import type { PrivacyProtocolSettings } from "@/lib/privacy/types";

type ScreenPrivacyPreference = {
  manual_enabled: boolean;
};

function isTableMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("privacy_preferences") ||
    message.includes("privacy_audit_log")
  );
}

export async function resolveBusinessPrivacyPolicy(
  businessId: string,
): Promise<PrivacyProtocolSettings> {
  const settings = await db.businessSettings.findFirst({
    where: { businessId },
    select: { settingsData: true },
  });

  return extractPrivacyProtocol(settings?.settingsData);
}

export async function updateBusinessPrivacyPolicy(args: {
  businessId: string;
  userId: string | null;
  nextPolicy: PrivacyProtocolSettings;
}) {
  const existing = await db.businessSettings.findFirst({
    where: { businessId: args.businessId },
    select: {
      id: true,
      settingsData: true,
      collectTax: true,
      posManagerPin: true,
    },
  });

  const nextSettingsData = withPrivacyProtocol(
    existing?.settingsData,
    args.nextPolicy,
  );

  const updated = await db.businessSettings.upsert({
    where: { businessId: args.businessId },
    update: {
      settingsData: nextSettingsData as Prisma.InputJsonValue,
    },
    create: {
      businessId: args.businessId,
      collectTax: existing?.collectTax ?? true,
      posManagerPin: existing?.posManagerPin ?? null,
      settingsData: nextSettingsData as Prisma.InputJsonValue,
    },
  });

  await db.systemAuditLog.create({
    data: {
      action: "privacy_policy_updated",
      entityType: "privacy_policy",
      entityId: args.businessId,
      userId: args.userId ?? undefined,
      businessId: args.businessId,
      newValues: {
        privacy_protocol: args.nextPolicy,
      },
    },
  });

  try {
    await db.$executeRaw`
      INSERT INTO privacy_audit_log (
        business_id,
        operator_user_id,
        action,
        details,
        created_at
      )
      VALUES (
        ${args.businessId}::uuid,
        ${args.userId},
        'privacy_policy_updated',
        ${JSON.stringify({ privacy_protocol: args.nextPolicy })}::jsonb,
        NOW()
      )
    `;
  } catch (error) {
    if (!isTableMissing(error)) {
      throw error;
    }
  }

  return updated;
}

export async function getManualScreenPrivacyPreference(args: {
  businessId: string;
  userId: string;
}): Promise<ScreenPrivacyPreference | null> {
  try {
    const rows = await db.$queryRaw<Array<{ manual_enabled: boolean }>>`
      SELECT manual_screen_privacy_enabled AS manual_enabled
      FROM privacy_preferences
      WHERE business_id = ${args.businessId}::uuid
        AND scope = 'operator'
        AND operator_user_id = ${args.userId}
      LIMIT 1
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return { manual_enabled: !!rows[0].manual_enabled };
  } catch (error) {
    if (isTableMissing(error)) {
      return null;
    }
    throw error;
  }
}

export async function setManualScreenPrivacyPreference(args: {
  businessId: string;
  userId: string;
  manualEnabled: boolean;
}) {
  try {
    await db.$executeRaw`
      INSERT INTO privacy_preferences (
        business_id,
        scope,
        operator_user_id,
        manual_screen_privacy_enabled,
        updated_at,
        created_at
      )
      VALUES (
        ${args.businessId}::uuid,
        'operator',
        ${args.userId},
        ${args.manualEnabled},
        NOW(),
        NOW()
      )
      ON CONFLICT (business_id, scope, operator_user_id)
      DO UPDATE SET
        manual_screen_privacy_enabled = EXCLUDED.manual_screen_privacy_enabled,
        updated_at = NOW()
    `;

    await db.$executeRaw`
      INSERT INTO privacy_audit_log (
        business_id,
        operator_user_id,
        action,
        details,
        created_at
      )
      VALUES (
        ${args.businessId}::uuid,
        ${args.userId},
        'screen_privacy_preference_updated',
        ${JSON.stringify({ manual_enabled: args.manualEnabled })}::jsonb,
        NOW()
      )
    `;

    return true;
  } catch (error) {
    if (isTableMissing(error)) {
      return false;
    }
    throw error;
  }
}
