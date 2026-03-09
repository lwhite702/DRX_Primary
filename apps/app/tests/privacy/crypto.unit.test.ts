// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

import { decryptPii, encryptPii, hashLookupValue } from "@/lib/privacy/crypto";

function genB64Key() {
  return randomBytes(32).toString("base64");
}

describe("privacy crypto", () => {
  beforeEach(() => {
    process.env.DRX_PII_KEY_CURRENT_B64 = genB64Key();
    process.env.DRX_PII_KEY_PREVIOUS_B64 = "";
    process.env.DRX_PII_HASH_KEY_B64 = genB64Key();
  });

  it("encrypts and decrypts customer values", async () => {
    const plaintext = "alias-123";
    const encrypted = await encryptPii(plaintext);

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = await decryptPii(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("detects tampering", async () => {
    const encrypted = await encryptPii("sensitive-field");
    expect(encrypted).toBeTruthy();

    const [version, nonce, cipher] = encrypted!.split(":");
    const tail = cipher.slice(-1) === "A" ? "B" : "A";
    const tampered = `${version}:${nonce}:${cipher.slice(0, -1)}${tail}`;

    await expect(decryptPii(tampered)).rejects.toThrow();
  });

  it("supports previous key fallback during rotation", async () => {
    const oldKey = genB64Key();
    process.env.DRX_PII_KEY_CURRENT_B64 = oldKey;

    const encrypted = await encryptPii("rotate-me");

    process.env.DRX_PII_KEY_CURRENT_B64 = genB64Key();
    process.env.DRX_PII_KEY_PREVIOUS_B64 = oldKey;

    const decrypted = await decryptPii(encrypted);
    expect(decrypted).toBe("rotate-me");
  });

  it("produces deterministic keyed hashes", async () => {
    const one = await hashLookupValue("USER@example.com");
    const two = await hashLookupValue("user@example.com");

    expect(one).toBeTruthy();
    expect(one).toBe(two);
  });
});
