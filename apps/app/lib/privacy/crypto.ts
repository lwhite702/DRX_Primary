import sodium from "libsodium-wrappers-sumo";
import { PRIVACY_PROTOCOL_VERSION } from "@/lib/privacy/types";

const KEY_BYTES = 32;
const NONCE_BYTES = 24;
const AAD = "drx:pii:v1";

let sodiumReady: Promise<void> | null = null;
let lastVaultErrorAt: string | null = null;

function markVaultError() {
  lastVaultErrorAt = new Date().toISOString();
}

function getEnv(name: string, required = true): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    if (required) {
      throw new Error(`${name} is required for DRX privacy protocol`);
    }
    return null;
  }
  return value;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getSodium() {
  if (!sodiumReady) {
    sodiumReady = sodium.ready;
  }
  await sodiumReady;
  return sodium;
}

async function decodeKeyB64(b64: string, label: string): Promise<Uint8Array> {
  const s = await getSodium();
  const key = s.from_base64(b64, s.base64_variants.ORIGINAL);
  if (key.length !== KEY_BYTES) {
    markVaultError();
    throw new Error(`${label} must decode to ${KEY_BYTES} bytes`);
  }
  return key;
}

function splitPayload(payload: string): [string, string, string] {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    markVaultError();
    throw new Error("Invalid encrypted payload format");
  }
  return [parts[0], parts[1], parts[2]];
}

async function decryptWithKey(
  nonceB64: string,
  cipherB64: string,
  key: Uint8Array,
): Promise<string> {
  const s = await getSodium();

  const nonce = s.from_base64(nonceB64, s.base64_variants.ORIGINAL_NO_PADDING);
  const ciphertext = s.from_base64(
    cipherB64,
    s.base64_variants.ORIGINAL_NO_PADDING,
  );

  const decrypted = s.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    s.from_string(AAD),
    nonce,
    key,
  );

  return s.to_string(decrypted);
}

export function sanitizePiiInput(value: unknown): string | null {
  return normalizeOptionalString(value);
}

export function getPiiEncryptionVersion(): number {
  return PRIVACY_PROTOCOL_VERSION;
}

export async function encryptPii(value: unknown): Promise<string | null> {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;

  const s = await getSodium();
  const key = await decodeKeyB64(getEnv("DRX_PII_KEY_CURRENT_B64")!, "DRX_PII_KEY_CURRENT_B64");

  const nonce = s.randombytes_buf(NONCE_BYTES);
  const cipher = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    s.from_string(normalized),
    s.from_string(AAD),
    null,
    nonce,
    key,
  );

  const nonceB64 = s.to_base64(nonce, s.base64_variants.ORIGINAL_NO_PADDING);
  const cipherB64 = s.to_base64(cipher, s.base64_variants.ORIGINAL_NO_PADDING);

  return `v${PRIVACY_PROTOCOL_VERSION}:${nonceB64}:${cipherB64}`;
}

export async function decryptPii(value: unknown): Promise<string | null> {
  const payload = normalizeOptionalString(value);
  if (!payload) return null;

  const [version, nonceB64, cipherB64] = splitPayload(payload);
  if (!version.startsWith("v")) {
    markVaultError();
    throw new Error("Invalid encrypted payload version");
  }

  let currentKey: Uint8Array;
  try {
    currentKey = await decodeKeyB64(
      getEnv("DRX_PII_KEY_CURRENT_B64")!,
      "DRX_PII_KEY_CURRENT_B64",
    );
  } catch (error) {
    markVaultError();
    throw error;
  }

  try {
    return await decryptWithKey(nonceB64, cipherB64, currentKey);
  } catch {
    markVaultError();
    const previous = getEnv("DRX_PII_KEY_PREVIOUS_B64", false);
    if (!previous) {
      throw new Error("Unable to decrypt with current key");
    }
    const previousKey = await decodeKeyB64(
      previous,
      "DRX_PII_KEY_PREVIOUS_B64",
    );
    return decryptWithKey(nonceB64, cipherB64, previousKey);
  }
}

export async function hashLookupValue(value: unknown): Promise<string | null> {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) return null;

  const s = await getSodium();
  const hashKey = await decodeKeyB64(
    getEnv("DRX_PII_HASH_KEY_B64")!,
    "DRX_PII_HASH_KEY_B64",
  );

  const digest = s.crypto_generichash(
    32,
    s.from_string(normalized),
    hashKey,
  );

  return s.to_base64(digest, s.base64_variants.ORIGINAL_NO_PADDING);
}

async function isValidKey(value: string | null, label: string): Promise<boolean> {
  if (!value) return false;
  try {
    await decodeKeyB64(value, label);
    return true;
  } catch {
    markVaultError();
    return false;
  }
}

export async function getVaultRuntimeStatus() {
  const currentRaw = getEnv("DRX_PII_KEY_CURRENT_B64", false);
  const previousRaw = getEnv("DRX_PII_KEY_PREVIOUS_B64", false);
  const hashRaw = getEnv("DRX_PII_HASH_KEY_B64", false);

  const currentLoaded = await isValidKey(
    currentRaw,
    "DRX_PII_KEY_CURRENT_B64",
  );
  const previousLoaded = await isValidKey(
    previousRaw,
    "DRX_PII_KEY_PREVIOUS_B64",
  );
  const hashLoaded = await isValidKey(hashRaw, "DRX_PII_HASH_KEY_B64");

  return {
    vault_mode_active: currentLoaded && hashLoaded,
    current_key_loaded: currentLoaded,
    previous_key_loaded: previousLoaded,
    hash_key_loaded: hashLoaded,
    last_error_at: lastVaultErrorAt,
  };
}

export function reportVaultError() {
  markVaultError();
}

export function getVaultLastErrorAt() {
  return lastVaultErrorAt;
}
