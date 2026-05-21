import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface PrivacyInventoryCounts {
  alias_count: number;
  phone_count: number;
  email_count: number;
  address_count: number;
  notes_count: number;
}

export interface PrivacyInventorySnapshot extends PrivacyInventoryCounts {
  id: string;
  business_id: string;
  captured_at: string;
  alias_delta: number;
  phone_delta: number;
  email_delta: number;
  address_delta: number;
  notes_delta: number;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function computePrivacyInventoryCounts(
  businessId: string,
): Promise<PrivacyInventoryCounts> {
  const rows = (await db.$queryRaw(Prisma.sql`
    SELECT
      COUNT(*) FILTER (
        WHERE COALESCE(alias_encrypted, alias) IS NOT NULL
      )::int AS alias_count,
      COUNT(*) FILTER (
        WHERE COALESCE(phone_encrypted, phone_number) IS NOT NULL
      )::int AS phone_count,
      COUNT(*) FILTER (
        WHERE COALESCE(email_encrypted, email) IS NOT NULL
      )::int AS email_count,
      COUNT(*) FILTER (
        WHERE COALESCE(address_encrypted, address) IS NOT NULL
      )::int AS address_count,
      COUNT(*) FILTER (
        WHERE COALESCE(notes_encrypted, notes) IS NOT NULL
      )::int AS notes_count
    FROM customers
    WHERE business_id = ${businessId}::uuid
  `)) as Array<Record<keyof PrivacyInventoryCounts, unknown>>;
  const [row] = rows;

  return {
    alias_count: toNumber(row?.alias_count),
    phone_count: toNumber(row?.phone_count),
    email_count: toNumber(row?.email_count),
    address_count: toNumber(row?.address_count),
    notes_count: toNumber(row?.notes_count),
  };
}

export async function getLatestPrivacyInventorySnapshot(
  businessId: string,
): Promise<PrivacyInventorySnapshot | null> {
  const snapshot = await db.privacyInventorySnapshot.findFirst({
    where: { businessId },
    orderBy: { capturedAt: "desc" },
  });

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    business_id: snapshot.businessId,
    captured_at: snapshot.capturedAt.toISOString(),
    alias_count: snapshot.aliasCount,
    phone_count: snapshot.phoneCount,
    email_count: snapshot.emailCount,
    address_count: snapshot.addressCount,
    notes_count: snapshot.notesCount,
    alias_delta: snapshot.aliasDelta,
    phone_delta: snapshot.phoneDelta,
    email_delta: snapshot.emailDelta,
    address_delta: snapshot.addressDelta,
    notes_delta: snapshot.notesDelta,
  };
}

export async function capturePrivacyInventorySnapshot(
  businessId: string,
): Promise<PrivacyInventorySnapshot> {
  const [counts, previous] = await Promise.all([
    computePrivacyInventoryCounts(businessId),
    db.privacyInventorySnapshot.findFirst({
      where: { businessId },
      orderBy: { capturedAt: "desc" },
    }),
  ]);

  const created = await db.privacyInventorySnapshot.create({
    data: {
      businessId,
      aliasCount: counts.alias_count,
      phoneCount: counts.phone_count,
      emailCount: counts.email_count,
      addressCount: counts.address_count,
      notesCount: counts.notes_count,
      aliasDelta: counts.alias_count - (previous?.aliasCount ?? 0),
      phoneDelta: counts.phone_count - (previous?.phoneCount ?? 0),
      emailDelta: counts.email_count - (previous?.emailCount ?? 0),
      addressDelta: counts.address_count - (previous?.addressCount ?? 0),
      notesDelta: counts.notes_count - (previous?.notesCount ?? 0),
    },
  });

  return {
    id: created.id,
    business_id: created.businessId,
    captured_at: created.capturedAt.toISOString(),
    alias_count: created.aliasCount,
    phone_count: created.phoneCount,
    email_count: created.emailCount,
    address_count: created.addressCount,
    notes_count: created.notesCount,
    alias_delta: created.aliasDelta,
    phone_delta: created.phoneDelta,
    email_delta: created.emailDelta,
    address_delta: created.addressDelta,
    notes_delta: created.notesDelta,
  };
}
