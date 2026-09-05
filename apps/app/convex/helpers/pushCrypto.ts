import { xchacha20poly1305 } from "@noble/ciphers/chacha";

const PUSH_KEY_CONTEXT = "drx:push-token:encryption-key:v1";
const PUSH_HASH_CONTEXT = "drx:push-token:hash-key:v1";
const NONCE_BYTES = 24;

export type PushTokenIdentity = {
  businessId: string;
  userId: string;
  deviceId: string;
  provider: "apns" | "expo" | "fcm";
};

function decodeBase64(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("DRX_PII_KEY_CURRENT_B64 must be valid base64");
  }
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeBase64(padded);
}

function toBufferSource(value: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(value.byteLength));
  copy.set(value);
  return copy;
}

function currentKey(): Uint8Array {
  const encodedKey = process.env.DRX_PII_KEY_CURRENT_B64?.trim();
  if (!encodedKey) {
    throw new Error(
      "DRX_PII_KEY_CURRENT_B64 is required for device token encryption",
    );
  }
  const rawKey = decodeBase64(encodedKey);
  if (rawKey.length !== 32) {
    throw new Error("DRX_PII_KEY_CURRENT_B64 must decode to 32 bytes");
  }
  return rawKey;
}

async function deriveSubkey(context: string): Promise<Uint8Array> {
  const rootKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(currentKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      rootKey,
      toBufferSource(new TextEncoder().encode(context)),
    ),
  );
}

function pushAad(identity: PushTokenIdentity): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify([
      "drx:push-token:v1",
      identity.businessId,
      identity.userId,
      identity.deviceId,
      identity.provider,
    ]),
  );
}

export async function hashPushToken(token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toBufferSource(await deriveSubkey(PUSH_HASH_CONTEXT)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    toBufferSource(new TextEncoder().encode(token)),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

export async function encryptPushToken(
  token: string,
  identity: PushTokenIdentity,
): Promise<{ ciphertext: string; version: 1 }> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const cipher = xchacha20poly1305(
    await deriveSubkey(PUSH_KEY_CONTEXT),
    nonce,
    pushAad(identity),
  );
  return {
    ciphertext: `pv1:${encodeBase64Url(nonce)}:${encodeBase64Url(
      cipher.encrypt(new TextEncoder().encode(token)),
    )}`,
    version: 1,
  };
}

export async function decryptPushToken(
  ciphertext: string,
  identity: PushTokenIdentity,
): Promise<string> {
  const [version, nonceValue, encryptedValue] = ciphertext.split(":");
  if (version !== "pv1" || !nonceValue || !encryptedValue) {
    throw new Error("Invalid encrypted push token payload");
  }
  const nonce = decodeBase64Url(nonceValue);
  if (nonce.length !== NONCE_BYTES) {
    throw new Error("Invalid encrypted push token nonce");
  }
  const cipher = xchacha20poly1305(
    await deriveSubkey(PUSH_KEY_CONTEXT),
    nonce,
    pushAad(identity),
  );
  return new TextDecoder().decode(
    cipher.decrypt(decodeBase64Url(encryptedValue)),
  );
}
