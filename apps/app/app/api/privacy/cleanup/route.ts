import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { extractPrivacyProtocol, withPrivacyProtocol } from "@/lib/privacy/settings";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.DRX_PRIVACY_CLEANUP_SECRET;
  if (!secret) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

function getCurrentHourInTimezone(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  return Number.isFinite(hour) ? hour : 0;
}

function isRetentionRunDue(
  lastRunAt: string | undefined,
  frequency: "daily" | "weekly",
): boolean {
  if (!lastRunAt) {
    return true;
  }

  const parsed = new Date(lastRunAt);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const intervalMs =
    frequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return Date.now() - parsed.getTime() >= intervalMs;
}

async function writeCleanupAuditSummary(args: {
  businessId: string;
  retentionDays: number;
  deleted: number;
  ephemeralDeleted: number;
  retentionDeleted: number;
  skippedDueBalance: number;
}) {
  await db.systemAuditLog.create({
    data: {
      action: "privacy_cleanup_hard_delete",
      entityType: "customer",
      businessId: args.businessId,
      newValues: {
        deleted_count: args.deleted,
        ephemeral_deleted: args.ephemeralDeleted,
        retention_deleted: args.retentionDeleted,
        skipped_due_balance: args.skippedDueBalance,
        retention_days: args.retentionDays,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId, businessId: authBusinessId } = await resolveAuthContext();
  const authorizedBySecret = isAuthorized(request);
  const authorizedByUser = !!userId;

  if (!authorizedBySecret && !authorizedByUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let overrideBusinessId =
      typeof body?.businessId === "string" ? body.businessId : undefined;

    if (authorizedByUser && !authorizedBySecret) {
      if (!authBusinessId) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
      }
      if (overrideBusinessId && overrideBusinessId !== authBusinessId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      overrideBusinessId = authBusinessId;
    }

    const settingsRows = await db.businessSettings.findMany({
      where: overrideBusinessId ? { businessId: overrideBusinessId } : undefined,
      select: {
        id: true,
        businessId: true,
        timezone: true,
        settingsData: true,
      },
    });

    const summary: Array<{
      business_id: string;
      deleted: number;
      ephemeral_deleted: number;
      retention_deleted: number;
      skipped_due_balance: number;
      retention_days: number;
    }> = [];
    type CustomerWithCreditLinks = {
      id: string;
      creditLimits: Array<{ id: string }>;
    };

    for (const settingsRow of settingsRows) {
      const privacy = extractPrivacyProtocol(settingsRow.settingsData);
      const retention = privacy.retention;
      const ephemeralProfiles = privacy.ephemeral_profiles;
      let ephemeralDeleted = 0;
      let retentionDeleted = 0;
      let skippedDueBalance = 0;

      if (ephemeralProfiles.enabled) {
        const now = new Date();
        const ephemeralCandidates = await db.customers.findMany({
          where: {
            businessId: settingsRow.businessId,
            isActive: true,
            ephemeral: true,
            ephemeralExpiresAt: {
              lte: now,
            },
          },
          select: {
            id: true,
            creditLimits: {
              where: {
                businessId: settingsRow.businessId,
                currentBalance: { gt: 0 },
              },
              select: { id: true },
            },
          },
        });

        const ephemeralDeletableIds = (ephemeralCandidates as CustomerWithCreditLinks[])
          .filter((row) => row.creditLimits.length === 0)
          .map((row) => row.id);

        skippedDueBalance +=
          ephemeralCandidates.length - ephemeralDeletableIds.length;

        if (ephemeralDeletableIds.length > 0) {
          await db.customers.deleteMany({
            where: {
              id: { in: ephemeralDeletableIds },
            },
          });
        }

        ephemeralDeleted = ephemeralDeletableIds.length;
      }

      if (!retention.enabled || retention.days <= 0 || !retention.hard_delete) {
        if (ephemeralDeleted > 0 || skippedDueBalance > 0) {
          await writeCleanupAuditSummary({
            businessId: settingsRow.businessId,
            retentionDays: retention.days,
            deleted: ephemeralDeleted,
            ephemeralDeleted,
            retentionDeleted,
            skippedDueBalance,
          });
          summary.push({
            business_id: settingsRow.businessId,
            deleted: ephemeralDeleted,
            ephemeral_deleted: ephemeralDeleted,
            retention_deleted: retentionDeleted,
            skipped_due_balance: skippedDueBalance,
            retention_days: retention.days,
          });
        }
        continue;
      }

      const timezone = settingsRow.timezone || "America/New_York";
      const currentHour = getCurrentHourInTimezone(timezone);

      if (currentHour !== retention.local_hour) {
        if (ephemeralDeleted > 0 || skippedDueBalance > 0) {
          await writeCleanupAuditSummary({
            businessId: settingsRow.businessId,
            retentionDays: retention.days,
            deleted: ephemeralDeleted,
            ephemeralDeleted,
            retentionDeleted,
            skippedDueBalance,
          });
          summary.push({
            business_id: settingsRow.businessId,
            deleted: ephemeralDeleted,
            ephemeral_deleted: ephemeralDeleted,
            retention_deleted: retentionDeleted,
            skipped_due_balance: skippedDueBalance,
            retention_days: retention.days,
          });
        }
        continue;
      }

      if (!isRetentionRunDue(retention.last_run_at, retention.frequency)) {
        if (ephemeralDeleted > 0 || skippedDueBalance > 0) {
          await writeCleanupAuditSummary({
            businessId: settingsRow.businessId,
            retentionDays: retention.days,
            deleted: ephemeralDeleted,
            ephemeralDeleted,
            retentionDeleted,
            skippedDueBalance,
          });
          summary.push({
            business_id: settingsRow.businessId,
            deleted: ephemeralDeleted,
            ephemeral_deleted: ephemeralDeleted,
            retention_deleted: retentionDeleted,
            skipped_due_balance: skippedDueBalance,
            retention_days: retention.days,
          });
        }
        continue;
      }

      const cutoff = new Date(Date.now() - retention.days * 24 * 60 * 60 * 1000);
      const candidates = await db.customers.findMany({
        where: {
          businessId: settingsRow.businessId,
          lastActivityAt: { lte: cutoff },
          isActive: true,
          ephemeral: false,
        },
        select: {
          id: true,
          creditLimits: {
            where: {
              businessId: settingsRow.businessId,
              currentBalance: { gt: 0 },
            },
            select: { id: true },
          },
        },
      });

      const deletableIds = (candidates as CustomerWithCreditLinks[])
        .filter((row) => row.creditLimits.length === 0)
        .map((row) => row.id);

      skippedDueBalance += candidates.length - deletableIds.length;

      if (deletableIds.length > 0) {
        await db.customers.deleteMany({
          where: {
            id: { in: deletableIds },
          },
        });
      }
      retentionDeleted = deletableIds.length;

      const nextSettingsData = withPrivacyProtocol(settingsRow.settingsData, {
        ...privacy,
        retention: {
          ...privacy.retention,
          last_run_at: new Date().toISOString(),
        },
      });

      await db.businessSettings.update({
        where: { id: settingsRow.id },
        data: {
          settingsData: nextSettingsData as Prisma.InputJsonValue,
        },
      });

      await writeCleanupAuditSummary({
        businessId: settingsRow.businessId,
        retentionDays: retention.days,
        deleted: ephemeralDeleted + retentionDeleted,
        ephemeralDeleted,
        retentionDeleted,
        skippedDueBalance,
      });

      await db.systemAuditLog.create({
        data: {
          action: "privacy_cleanup_retention_cutoff",
          entityType: "customer",
          businessId: settingsRow.businessId,
          newValues: {
            cutoff: cutoff.toISOString(),
            retention_days: retention.days,
          },
        },
      });

      summary.push({
        business_id: settingsRow.businessId,
        deleted: ephemeralDeleted + retentionDeleted,
        ephemeral_deleted: ephemeralDeleted,
        retention_deleted: retentionDeleted,
        skipped_due_balance: skippedDueBalance,
        retention_days: retention.days,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: summary.length,
      summary,
    });
  } catch (error) {
    console.error("[privacy/cleanup]", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
