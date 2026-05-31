import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api/response";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_KILL_SWITCH_FLAGS } from "@/lib/posthog/flags-manifest";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.DRX_PRIVACY_CLEANUP_SECRET;
  if (!secret) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

function isMissingRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("customer_cleanup_queue") ||
    message.includes("customer_legal_holds") ||
    message.includes("customer_retention_events") ||
    message.includes("customer_deletion_audit")
  );
}

type QueueItem = {
  id: string;
  business_id: string;
  customer_id: string;
  reason: string | null;
};

async function hasActiveLegalHold(
  businessId: string,
  customerId: string,
): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id::text
    FROM customer_legal_holds
    WHERE business_id = ${businessId}::uuid
      AND customer_id = ${customerId}::uuid
      AND active = true
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0;
}

async function hasActiveCreditBalance(
  businessId: string,
  customerId: string,
): Promise<boolean> {
  const row = await db.creditLimit.findFirst({
    where: {
      businessId,
      customerId,
      currentBalance: { gt: 0 },
    },
    select: { id: true },
  });

  return !!row;
}

async function updateQueueStatus(args: {
  id: string;
  status: "completed" | "skipped";
  reason: string;
}) {
  await db.$executeRaw`
    UPDATE customer_cleanup_queue
    SET status = ${args.status},
        reason = ${args.reason},
        updated_at = NOW()
    WHERE id = ${args.id}::uuid
  `;
}

async function writeRetentionEvent(args: {
  businessId: string;
  customerId: string;
  eventType: string;
  reason: string;
}) {
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
}

async function writeDeletionAudit(args: {
  businessId: string;
  customerId: string;
  reason: string;
}) {
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
}

async function processQueueItem(item: QueueItem) {
  const customer = await db.customers.findFirst({
    where: {
      id: item.customer_id,
      businessId: item.business_id,
      isActive: true,
    },
    select: { id: true },
  });

  if (!customer) {
    await updateQueueStatus({
      id: item.id,
      status: "skipped",
      reason: "customer_not_found_or_inactive",
    });
    return { deleted: false, skipped: true, reason: "customer_missing" };
  }

  if (await hasActiveLegalHold(item.business_id, item.customer_id)) {
    await updateQueueStatus({
      id: item.id,
      status: "skipped",
      reason: "legal_hold_active",
    });
    await writeRetentionEvent({
      businessId: item.business_id,
      customerId: item.customer_id,
      eventType: "cleanup_skipped",
      reason: "legal_hold_active",
    });
    return { deleted: false, skipped: true, reason: "legal_hold" };
  }

  if (await hasActiveCreditBalance(item.business_id, item.customer_id)) {
    await updateQueueStatus({
      id: item.id,
      status: "skipped",
      reason: "active_credit_balance",
    });
    await writeRetentionEvent({
      businessId: item.business_id,
      customerId: item.customer_id,
      eventType: "cleanup_skipped",
      reason: "active_credit_balance",
    });
    return { deleted: false, skipped: true, reason: "active_balance" };
  }

  await writeRetentionEvent({
    businessId: item.business_id,
    customerId: item.customer_id,
    eventType: "customer_deleted",
    reason: "cleanup_queue_worker",
  });
  await writeDeletionAudit({
    businessId: item.business_id,
    customerId: item.customer_id,
    reason: "cleanup_queue_worker",
  });

  // Mark completed before deletion; row may be cascaded on delete.
  await updateQueueStatus({
    id: item.id,
    status: "completed",
    reason: "deleted",
  });

  await db.customers.delete({
    where: { id: item.customer_id },
  });

  return { deleted: true, skipped: false, reason: "deleted" };
}

export async function POST(request: NextRequest) {
  const { userId, businessId: authBusinessId } = await resolveAuthContext();
  const authorizedBySecret = isAuthorized(request);
  const authorizedByUser = !!userId;

  if (!authorizedBySecret && !authorizedByUser) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const killSwitchEnabled = await ensureServerFlag(
    OPS_KILL_SWITCH_FLAGS.privacyCleanupQueue,
    {
      distinctId: userId ?? "cron-cleanup-queue",
      defaultValue: true,
      groups: authBusinessId ? { business: authBusinessId } : undefined,
    },
  );
  if (!killSwitchEnabled) {
    return errorResponse(
      "FEATURE_DISABLED",
      "Privacy cleanup queue worker is temporarily disabled",
      503,
    );
  }

  const featureEnabled = await ensureServerFlag("feat_privacy_cleanup_queue_v2", {
    distinctId: userId ?? "cron-cleanup-queue",
    defaultValue: false,
    groups: authBusinessId ? { business: authBusinessId } : undefined,
  });
  if (!featureEnabled) {
    return errorResponse(
      "FEATURE_DISABLED",
      "Privacy cleanup queue worker feature is disabled",
      503,
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const requestedBusinessId =
      typeof body?.businessId === "string" ? body.businessId : undefined;

    let businessId = requestedBusinessId;
    if (authorizedByUser && !authorizedBySecret) {
      if (!authBusinessId) {
        return errorResponse("NOT_FOUND", "Business not found", 404);
      }
      if (businessId && businessId !== authBusinessId) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
      businessId = authBusinessId;
    }

    const limitRaw = Number(body?.limit ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.trunc(limitRaw))) : 100;

    const queueRows = await db.$queryRaw<QueueItem[]>`
      SELECT
        id::text,
        business_id::text,
        customer_id::text,
        reason
      FROM customer_cleanup_queue
      WHERE status = 'pending'
        AND run_after <= NOW()
        AND (${businessId ?? null}::uuid IS NULL OR business_id = ${businessId ?? null}::uuid)
      ORDER BY run_after ASC
      LIMIT ${limit}
    `;

    let processed = 0;
    let deleted = 0;
    let skipped = 0;

    for (const row of queueRows) {
      const result = await processQueueItem(row);
      processed += 1;
      if (result.deleted) deleted += 1;
      if (result.skipped) skipped += 1;
    }

    return successResponse({
      ok: true,
      processed,
      deleted,
      skipped,
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Cleanup queue tables are not available yet",
        500,
      );
    }
    console.error("[privacy/cleanup/queue]", error);
    return errorResponse("INTERNAL_ERROR", "Cleanup queue processing failed", 500);
  }
}

export async function GET() {
  const { userId } = await resolveAuthContext();
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  return successResponse({
    status: "healthy",
    endpoint: "privacy-cleanup-queue",
  });
}
