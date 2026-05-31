import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { extractPrivacyProtocol, withPrivacyProtocol } from "@/lib/privacy/settings";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

function isMissingRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("customer_legal_holds") ||
    message.includes("customer_cleanup_queue") ||
    message.includes("customer_retention_events") ||
    message.includes("customer_deletion_audit")
  );
}

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
  skippedCount: number;
  queuedCount: number;
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
        skipped_due_balance: args.skippedCount,
        queued_for_worker: args.queuedCount,
        retention_days: args.retentionDays,
      },
    },
  });
}

async function hasActiveLegalHold(
  businessId: string,
  customerId: string,
): Promise<boolean> {
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM customer_legal_holds
      WHERE business_id = ${businessId}::uuid
        AND customer_id = ${customerId}::uuid
        AND active = true
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    if (isMissingRelationError(error)) {
      return false;
    }
    throw error;
  }
}

async function queueCleanupCandidate(args: {
  businessId: string;
  customerId: string;
  reason: string;
}) {
  try {
    await db.$executeRaw`
      INSERT INTO customer_cleanup_queue (
        business_id,
        customer_id,
        run_after,
        status,
        reason,
        created_at,
        updated_at
      )
      VALUES (
        ${args.businessId}::uuid,
        ${args.customerId}::uuid,
        NOW(),
        'pending',
        ${args.reason},
        NOW(),
        NOW()
      )
      ON CONFLICT (business_id, customer_id, status)
      DO NOTHING
    `;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

async function markCleanupQueueStatus(args: {
  businessId: string;
  customerId: string;
  status: "completed" | "skipped";
  reason: string;
}) {
  try {
    await db.$executeRaw`
      UPDATE customer_cleanup_queue
      SET status = ${args.status},
          reason = ${args.reason},
          updated_at = NOW()
      WHERE business_id = ${args.businessId}::uuid
        AND customer_id = ${args.customerId}::uuid
        AND status = 'pending'
    `;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

async function writeRetentionEvent(args: {
  businessId: string;
  customerId: string;
  eventType: string;
  reason: string;
}) {
  try {
    await db.$executeRaw`
      INSERT INTO customer_retention_events (
        business_id,
        customer_id,
        event_type,
        reason,
        metadata,
        created_at
      )
      VALUES (
        ${args.businessId}::uuid,
        ${args.customerId}::uuid,
        ${args.eventType},
        ${args.reason},
        '{}'::jsonb,
        NOW()
      )
    `;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

async function writeDeletionAudit(args: {
  businessId: string;
  customerId: string;
  reason: string;
}) {
  try {
    await db.$executeRaw`
      INSERT INTO customer_deletion_audit (
        business_id,
        customer_id,
        delete_mode,
        reason,
        metadata,
        created_at
      )
      VALUES (
        ${args.businessId}::uuid,
        ${args.customerId}::uuid,
        'hard_delete',
        ${args.reason},
        '{}'::jsonb,
        NOW()
      )
    `;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
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
      queued_count: number;
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
      let skippedDueLegalHold = 0;
      let queuedForWorker = 0;
      const queueModeEnabled = await ensureServerFlag(
        "feat_privacy_cleanup_queue_v2",
        {
          distinctId: userId ?? settingsRow.businessId,
          groups: { business: settingsRow.businessId },
          defaultValue: false,
        },
      );

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

        const ephemeralDeletableIds: string[] = [];
        for (const row of ephemeralCandidates as CustomerWithCreditLinks[]) {
          await queueCleanupCandidate({
            businessId: settingsRow.businessId,
            customerId: row.id,
            reason: "ephemeral_expired",
          });

          if (queueModeEnabled) {
            queuedForWorker += 1;
            await writeRetentionEvent({
              businessId: settingsRow.businessId,
              customerId: row.id,
              eventType: "cleanup_queued",
              reason: "ephemeral_expired",
            });
            continue;
          }

          if (row.creditLimits.length > 0) {
            skippedDueBalance += 1;
            await markCleanupQueueStatus({
              businessId: settingsRow.businessId,
              customerId: row.id,
              status: "skipped",
              reason: "active_credit_balance",
            });
            await writeRetentionEvent({
              businessId: settingsRow.businessId,
              customerId: row.id,
              eventType: "cleanup_skipped",
              reason: "active_credit_balance",
            });
            continue;
          }

          const legalHold = await hasActiveLegalHold(settingsRow.businessId, row.id);
          if (legalHold) {
            skippedDueLegalHold += 1;
            await markCleanupQueueStatus({
              businessId: settingsRow.businessId,
              customerId: row.id,
              status: "skipped",
              reason: "legal_hold_active",
            });
            await writeRetentionEvent({
              businessId: settingsRow.businessId,
              customerId: row.id,
              eventType: "cleanup_skipped",
              reason: "legal_hold_active",
            });
            continue;
          }

          ephemeralDeletableIds.push(row.id);
        }

        if (ephemeralDeletableIds.length > 0) {
          await db.customers.deleteMany({
            where: {
              id: { in: ephemeralDeletableIds },
            },
          });
          for (const customerId of ephemeralDeletableIds) {
            await markCleanupQueueStatus({
              businessId: settingsRow.businessId,
              customerId,
              status: "completed",
              reason: "ephemeral_expired_deleted",
            });
            await writeRetentionEvent({
              businessId: settingsRow.businessId,
              customerId,
              eventType: "customer_deleted",
              reason: "ephemeral_expired",
            });
            await writeDeletionAudit({
              businessId: settingsRow.businessId,
              customerId,
              reason: "ephemeral_expired",
            });
          }
        }

        ephemeralDeleted = ephemeralDeletableIds.length;
      }

      if (!retention.enabled || retention.days <= 0 || !retention.hard_delete) {
        if (ephemeralDeleted > 0 || skippedDueBalance > 0 || skippedDueLegalHold > 0) {
          await writeCleanupAuditSummary({
            businessId: settingsRow.businessId,
            retentionDays: retention.days,
            deleted: ephemeralDeleted,
            ephemeralDeleted,
            retentionDeleted,
            skippedCount: skippedDueBalance + skippedDueLegalHold,
            queuedCount: queuedForWorker,
          });
          summary.push({
            business_id: settingsRow.businessId,
            deleted: ephemeralDeleted,
            ephemeral_deleted: ephemeralDeleted,
            retention_deleted: retentionDeleted,
            skipped_due_balance: skippedDueBalance + skippedDueLegalHold,
            queued_count: queuedForWorker,
            retention_days: retention.days,
          });
        }
        continue;
      }

      const timezone = settingsRow.timezone || "America/New_York";
      const currentHour = getCurrentHourInTimezone(timezone);

      if (currentHour !== retention.local_hour) {
        if (ephemeralDeleted > 0 || skippedDueBalance > 0 || skippedDueLegalHold > 0) {
          await writeCleanupAuditSummary({
            businessId: settingsRow.businessId,
            retentionDays: retention.days,
            deleted: ephemeralDeleted,
            ephemeralDeleted,
            retentionDeleted,
            skippedCount: skippedDueBalance + skippedDueLegalHold,
            queuedCount: queuedForWorker,
          });
          summary.push({
            business_id: settingsRow.businessId,
            deleted: ephemeralDeleted,
            ephemeral_deleted: ephemeralDeleted,
            retention_deleted: retentionDeleted,
            skipped_due_balance: skippedDueBalance + skippedDueLegalHold,
            queued_count: queuedForWorker,
            retention_days: retention.days,
          });
        }
        continue;
      }

      if (!isRetentionRunDue(retention.last_run_at, retention.frequency)) {
        if (ephemeralDeleted > 0 || skippedDueBalance > 0 || skippedDueLegalHold > 0) {
          await writeCleanupAuditSummary({
            businessId: settingsRow.businessId,
            retentionDays: retention.days,
            deleted: ephemeralDeleted,
            ephemeralDeleted,
            retentionDeleted,
            skippedCount: skippedDueBalance + skippedDueLegalHold,
            queuedCount: queuedForWorker,
          });
          summary.push({
            business_id: settingsRow.businessId,
            deleted: ephemeralDeleted,
            ephemeral_deleted: ephemeralDeleted,
            retention_deleted: retentionDeleted,
            skipped_due_balance: skippedDueBalance + skippedDueLegalHold,
            queued_count: queuedForWorker,
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

      const deletableIds: string[] = [];
      for (const row of candidates as CustomerWithCreditLinks[]) {
        await queueCleanupCandidate({
          businessId: settingsRow.businessId,
          customerId: row.id,
          reason: "retention_cutoff",
        });

        if (queueModeEnabled) {
          queuedForWorker += 1;
          await writeRetentionEvent({
            businessId: settingsRow.businessId,
            customerId: row.id,
            eventType: "cleanup_queued",
            reason: "retention_cutoff",
          });
          continue;
        }

        if (row.creditLimits.length > 0) {
          skippedDueBalance += 1;
          await markCleanupQueueStatus({
            businessId: settingsRow.businessId,
            customerId: row.id,
            status: "skipped",
            reason: "active_credit_balance",
          });
          await writeRetentionEvent({
            businessId: settingsRow.businessId,
            customerId: row.id,
            eventType: "cleanup_skipped",
            reason: "active_credit_balance",
          });
          continue;
        }

        const legalHold = await hasActiveLegalHold(settingsRow.businessId, row.id);
        if (legalHold) {
          skippedDueLegalHold += 1;
          await markCleanupQueueStatus({
            businessId: settingsRow.businessId,
            customerId: row.id,
            status: "skipped",
            reason: "legal_hold_active",
          });
          await writeRetentionEvent({
            businessId: settingsRow.businessId,
            customerId: row.id,
            eventType: "cleanup_skipped",
            reason: "legal_hold_active",
          });
          continue;
        }

        deletableIds.push(row.id);
      }

      if (deletableIds.length > 0) {
        await db.customers.deleteMany({
          where: {
            id: { in: deletableIds },
          },
        });
        for (const customerId of deletableIds) {
          await markCleanupQueueStatus({
            businessId: settingsRow.businessId,
            customerId,
            status: "completed",
            reason: "retention_cutoff_deleted",
          });
          await writeRetentionEvent({
            businessId: settingsRow.businessId,
            customerId,
            eventType: "customer_deleted",
            reason: "retention_cutoff",
          });
          await writeDeletionAudit({
            businessId: settingsRow.businessId,
            customerId,
            reason: "retention_cutoff",
          });
        }
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
        skippedCount: skippedDueBalance + skippedDueLegalHold,
        queuedCount: queuedForWorker,
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
        skipped_due_balance: skippedDueBalance + skippedDueLegalHold,
        queued_count: queuedForWorker,
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
