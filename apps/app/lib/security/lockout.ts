import { db } from "@/lib/db";
import { hashLookupValue } from "@/lib/privacy/crypto";

export const LOCKOUT_MAX_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MINUTES = 15;
export const LOCKOUT_DURATION_MINUTES = 15;

export interface LockoutState {
  locked: boolean;
  remaining_attempts: number;
  locked_until: string | null;
}

function normalizeIdentifier(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function nowPlusMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isWindowExpired(windowStartedAt: Date): boolean {
  return Date.now() - windowStartedAt.getTime() > LOCKOUT_WINDOW_MINUTES * 60 * 1000;
}

async function getHashedKeys(identifier: string, ipAddress?: string | null) {
  const identifierHash = await hashLookupValue(identifier);
  if (!identifierHash) {
    throw new Error("Identifier is required");
  }

  const ipHash = (await hashLookupValue(ipAddress || "")) || "";
  return { identifierHash, ipHash };
}

export function deriveLockoutState(
  failedCount: number,
  lockedUntil: Date | null,
): LockoutState {
  const locked = !!lockedUntil && lockedUntil.getTime() > Date.now();
  return {
    locked,
    remaining_attempts: locked
      ? 0
      : Math.max(0, LOCKOUT_MAX_ATTEMPTS - failedCount),
    locked_until: lockedUntil ? lockedUntil.toISOString() : null,
  };
}

export async function checkLockout(
  rawIdentifier: unknown,
  ipAddress?: string | null,
): Promise<LockoutState> {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (!identifier) {
    return {
      locked: false,
      remaining_attempts: LOCKOUT_MAX_ATTEMPTS,
      locked_until: null,
    };
  }

  const { identifierHash, ipHash } = await getHashedKeys(identifier, ipAddress);

  const record = await db.authLockoutWindow.findUnique({
    where: {
      identifierHash_ipHash: {
        identifierHash,
        ipHash,
      },
    },
  });

  if (!record) {
    return {
      locked: false,
      remaining_attempts: LOCKOUT_MAX_ATTEMPTS,
      locked_until: null,
    };
  }

  if (isWindowExpired(record.windowStartedAt)) {
    await db.authLockoutWindow.update({
      where: { id: record.id },
      data: {
        failedCount: 0,
        windowStartedAt: new Date(),
        lockedUntil: null,
      },
    });

    return {
      locked: false,
      remaining_attempts: LOCKOUT_MAX_ATTEMPTS,
      locked_until: null,
    };
  }

  return deriveLockoutState(record.failedCount, record.lockedUntil);
}

export async function recordLockoutFailure(
  rawIdentifier: unknown,
  ipAddress?: string | null,
): Promise<LockoutState> {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (!identifier) {
    return {
      locked: false,
      remaining_attempts: LOCKOUT_MAX_ATTEMPTS,
      locked_until: null,
    };
  }

  const { identifierHash, ipHash } = await getHashedKeys(identifier, ipAddress);

  const existing = await db.authLockoutWindow.findUnique({
    where: {
      identifierHash_ipHash: {
        identifierHash,
        ipHash,
      },
    },
  });

  if (!existing) {
    await db.authLockoutWindow.create({
      data: {
        identifierHash,
        ipHash,
        failedCount: 1,
        windowStartedAt: new Date(),
      },
    });

    return {
      locked: false,
      remaining_attempts: LOCKOUT_MAX_ATTEMPTS - 1,
      locked_until: null,
    };
  }

  const expired = isWindowExpired(existing.windowStartedAt);
  const nextFailedCount = expired ? 1 : existing.failedCount + 1;
  const shouldLock = nextFailedCount >= LOCKOUT_MAX_ATTEMPTS;
  const lockedUntil = shouldLock ? nowPlusMinutes(LOCKOUT_DURATION_MINUTES) : null;

  const updated = await db.authLockoutWindow.update({
    where: { id: existing.id },
    data: {
      failedCount: nextFailedCount,
      windowStartedAt: expired ? new Date() : existing.windowStartedAt,
      lockedUntil,
    },
  });

  return deriveLockoutState(updated.failedCount, updated.lockedUntil);
}

export async function recordLockoutSuccess(
  rawIdentifier: unknown,
  ipAddress?: string | null,
): Promise<LockoutState> {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (!identifier) {
    return {
      locked: false,
      remaining_attempts: LOCKOUT_MAX_ATTEMPTS,
      locked_until: null,
    };
  }

  const { identifierHash, ipHash } = await getHashedKeys(identifier, ipAddress);

  await db.authLockoutWindow.deleteMany({
    where: {
      identifierHash,
      ipHash,
    },
  });

  return {
    locked: false,
    remaining_attempts: LOCKOUT_MAX_ATTEMPTS,
    locked_until: null,
  };
}
