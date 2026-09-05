import { xchacha20poly1305 } from "@noble/ciphers/chacha";

const LEGACY_DELIVERY_AAD = "drx:delivery-address:v2";
const DELIVERY_ENCRYPTION_CONTEXT = "drx:delivery:encryption-key:v2";
const DELIVERY_HASH_CONTEXT = "drx:delivery:hash-key:v2";
const DELIVERY_NONCE_CONTEXT = "drx:delivery:nonce:v3";
const NONCE_BYTES = 24;

export type DeliveryEncryptionIdentity = {
  businessId: string;
  saleId: string;
  deliveryId: string;
};

function normalizeAddress(address: string): string {
  const normalized = address.trim().replace(/\s+/g, " ");
  if (normalized.length < 5 || normalized.length > 500) {
    throw new Error(
      "INVALID_ARGUMENT: Delivery address must be between 5 and 500 characters",
    );
  }
  return normalized;
}

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
      "DRX_PII_KEY_CURRENT_B64 is required for delivery address encryption",
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
  const derived = await crypto.subtle.sign(
    "HMAC",
    rootKey,
    toBufferSource(new TextEncoder().encode(context)),
  );
  return new Uint8Array(derived);
}

function encodeIdentityPart(label: string, value: string): string {
  if (!value) {
    throw new Error(`Delivery encryption identity is missing ${label}`);
  }
  return `${label}:${value.length}:${value}`;
}

function deliveryAad(identity: DeliveryEncryptionIdentity): Uint8Array {
  return new TextEncoder().encode(
    [
      "drx:delivery-address:v3",
      encodeIdentityPart("business", identity.businessId),
      encodeIdentityPart("sale", identity.saleId),
      encodeIdentityPart("delivery", identity.deliveryId),
    ].join("|"),
  );
}

async function deliveryNonce(aad: Uint8Array): Promise<Uint8Array> {
  const nonceKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(await deriveSubkey(DELIVERY_NONCE_CONTEXT)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    nonceKey,
    toBufferSource(aad),
  );
  return new Uint8Array(digest).slice(0, NONCE_BYTES);
}

export async function hashDeliveryAddress(address: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toBufferSource(await deriveSubkey(DELIVERY_HASH_CONTEXT)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    toBufferSource(new TextEncoder().encode(normalizeAddress(address))),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

export async function encryptDeliveryAddress(
  address: string,
  identity: DeliveryEncryptionIdentity,
): Promise<{ ciphertext: string; version: number }> {
  const aad = deliveryAad(identity);
  const nonce = await deliveryNonce(aad);
  const cipher = xchacha20poly1305(
    await deriveSubkey(DELIVERY_ENCRYPTION_CONTEXT),
    nonce,
    aad,
  );
  const encrypted = cipher.encrypt(
    new TextEncoder().encode(normalizeAddress(address)),
  );
  return {
    ciphertext: `dv3:${encodeBase64Url(nonce)}:${encodeBase64Url(encrypted)}`,
    version: 3,
  };
}

export async function decryptDeliveryAddress(
  ciphertext: string,
  identity?: DeliveryEncryptionIdentity,
): Promise<string> {
  const [version, nonceValue, encryptedValue] = ciphertext.split(":");
  if (
    (version !== "dv2" && version !== "dv3") ||
    !nonceValue ||
    !encryptedValue
  ) {
    throw new Error("Invalid encrypted delivery address payload");
  }
  const nonce = decodeBase64Url(nonceValue);
  if (nonce.length !== NONCE_BYTES) {
    throw new Error("Invalid encrypted delivery address nonce");
  }
  if (version === "dv3" && !identity) {
    throw new Error("Delivery encryption identity is required for dv3 payloads");
  }
  const aad =
    version === "dv2"
      ? new TextEncoder().encode(LEGACY_DELIVERY_AAD)
      : deliveryAad(identity!);
  const cipher = xchacha20poly1305(
    await deriveSubkey(DELIVERY_ENCRYPTION_CONTEXT),
    nonce,
    aad,
  );
  const decrypted = cipher.decrypt(decodeBase64Url(encryptedValue));
  return new TextDecoder().decode(decrypted);
}
