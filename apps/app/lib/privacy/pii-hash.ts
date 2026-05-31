import { hashLookupValue } from "@/lib/privacy/crypto";
import {
  normalizeAlias,
  normalizeEmail,
  normalizePhone,
} from "@/lib/customers/core/customer-normalizer";

export const PII_HASH_VERSION = 1;

export type DeterministicLookupHashes = {
  aliasHash: string | null;
  phoneHash: string | null;
  emailHash: string | null;
  hashVersion: number;
};

function normalizeLegacyHashInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase().normalize("NFKC");
  return trimmed.length > 0 ? trimmed : null;
}

async function hashLookupCandidates(values: Array<string | null>): Promise<string[]> {
  const hashes = await Promise.all(values.map((value) => hashLookupValue(value)));
  return Array.from(new Set(hashes.filter((hash): hash is string => !!hash)));
}

export async function hashAliasLookupCandidates(value: unknown): Promise<string[]> {
  return hashLookupCandidates([
    normalizeLegacyHashInput(typeof value === "string" ? value : String(value ?? "")),
    normalizeAlias(value),
  ]);
}

export async function hashPhoneLookupCandidates(value: unknown): Promise<string[]> {
  return hashLookupCandidates([
    normalizeLegacyHashInput(typeof value === "string" ? value : String(value ?? "")),
    normalizePhone(value),
  ]);
}

export async function hashEmailLookupCandidates(value: unknown): Promise<string[]> {
  return hashLookupCandidates([
    normalizeLegacyHashInput(typeof value === "string" ? value : String(value ?? "")),
    normalizeEmail(value),
  ]);
}

export async function hashAliasLookup(value: unknown): Promise<string | null> {
  const hashes = await hashAliasLookupCandidates(value);
  return hashes[0] ?? null;
}

export async function hashPhoneLookup(value: unknown): Promise<string | null> {
  const hashes = await hashPhoneLookupCandidates(value);
  return hashes[0] ?? null;
}

export async function hashEmailLookup(value: unknown): Promise<string | null> {
  const hashes = await hashEmailLookupCandidates(value);
  return hashes[0] ?? null;
}

export async function buildDeterministicLookupHashes(input: {
  alias?: unknown;
  phone?: unknown;
  email?: unknown;
}): Promise<DeterministicLookupHashes> {
  const [aliasHash, phoneHash, emailHash] = await Promise.all([
    hashLookupValue(normalizeAlias(input.alias)),
    hashLookupValue(normalizePhone(input.phone)),
    hashLookupValue(normalizeEmail(input.email)),
  ]);

  return {
    aliasHash,
    phoneHash,
    emailHash,
    hashVersion: PII_HASH_VERSION,
  };
}
