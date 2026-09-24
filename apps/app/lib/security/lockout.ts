import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { hashLookupValue } from "@/lib/privacy/crypto";

export const LOCKOUT_MAX_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MINUTES = 15;
export const LOCKOUT_DURATION_MINUTES = 15;
export interface LockoutState { locked: boolean; remaining_attempts: number; locked_until: string | null; }

function normalizeIdentifier(value: unknown): string { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function nowPlusMinutes(minutes: number): Date { return new Date(Date.now() + minutes * 60 * 1000); }
export function isWindowExpired(windowStartedAt: Date): boolean { return Date.now() - windowStartedAt.getTime() > LOCKOUT_WINDOW_MINUTES * 60 * 1000; }
export function deriveLockoutState(failedCount: number, lockedUntil: Date | null): LockoutState { const locked = !!lockedUntil && lockedUntil.getTime() > Date.now(); return { locked, remaining_attempts: locked ? 0 : Math.max(0, LOCKOUT_MAX_ATTEMPTS - failedCount), locked_until: lockedUntil?.toISOString() ?? null }; }
function client() { const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim(); if (!url) throw new Error("Convex unavailable"); return new ConvexHttpClient(url); }
async function keys(identifier: string, ipAddress?: string | null) { const identifierHash = await hashLookupValue(identifier); if (!identifierHash) throw new Error("Identifier is required"); return { identifierHash, ipHash: (await hashLookupValue(ipAddress || "")) || "" }; }

export async function checkLockout(rawIdentifier: unknown, ipAddress?: string | null): Promise<LockoutState> {
  const identifier = normalizeIdentifier(rawIdentifier); if (!identifier) return { locked: false, remaining_attempts: LOCKOUT_MAX_ATTEMPTS, locked_until: null };
  const key = await keys(identifier, ipAddress); const row = await client().query(api.lockout.get, key);
  if (!row) return { locked: false, remaining_attempts: LOCKOUT_MAX_ATTEMPTS, locked_until: null };
  const started = new Date(row.windowStartedAt);
  if (isWindowExpired(started)) { await client().mutation(api.lockout.resetExpired, key); return { locked: false, remaining_attempts: LOCKOUT_MAX_ATTEMPTS, locked_until: null }; }
  return deriveLockoutState(row.failedCount, row.lockedUntil === null ? null : new Date(row.lockedUntil));
}

export async function recordLockoutFailure(rawIdentifier: unknown, ipAddress?: string | null): Promise<LockoutState> {
  const identifier = normalizeIdentifier(rawIdentifier); if (!identifier) return { locked: false, remaining_attempts: LOCKOUT_MAX_ATTEMPTS, locked_until: null };
  const row = await client().mutation(api.lockout.recordFailure, { ...(await keys(identifier, ipAddress)), maxAttempts: LOCKOUT_MAX_ATTEMPTS, durationMs: LOCKOUT_DURATION_MINUTES * 60 * 1000 });
  return deriveLockoutState(row.failedCount, row.lockedUntil === null ? null : new Date(row.lockedUntil));
}

export async function recordLockoutSuccess(rawIdentifier: unknown, ipAddress?: string | null): Promise<LockoutState> {
  const identifier = normalizeIdentifier(rawIdentifier); if (!identifier) return { locked: false, remaining_attempts: LOCKOUT_MAX_ATTEMPTS, locked_until: null };
  await client().mutation(api.lockout.clear, await keys(identifier, ipAddress)); return { locked: false, remaining_attempts: LOCKOUT_MAX_ATTEMPTS, locked_until: null };
}
