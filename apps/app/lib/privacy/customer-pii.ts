import {
  decryptPii,
  encryptPii,
  getPiiEncryptionVersion,
  getVaultRuntimeStatus,
  hashLookupValue,
  reportVaultError,
  sanitizePiiInput,
} from "@/lib/privacy/crypto";
import { logPrivacySecurityEvent } from "@/lib/privacy/security-events";

export interface CustomerPiiFields {
  alias: string | null;
  first_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface CustomerPiiStorage {
  aliasEncrypted: string | null;
  firstNameEncrypted: string | null;
  phoneEncrypted: string | null;
  emailEncrypted: string | null;
  addressEncrypted: string | null;
  notesEncrypted: string | null;
  aliasHash: string | null;
  phoneHash: string | null;
  emailHash: string | null;
  piiEncryptionVersion: number;
}

export function getCustomerDisplayName(pii: CustomerPiiFields): string {
  if (pii.alias) return pii.alias;
  if (pii.first_name) return pii.first_name;
  if (pii.phone) return `Customer ${pii.phone.slice(-4)}`;
  return "Customer";
}

export async function encodeCustomerPii(
  fields: Partial<CustomerPiiFields>,
): Promise<CustomerPiiStorage> {
  const alias = sanitizePiiInput(fields.alias);
  const firstName = sanitizePiiInput(fields.first_name);
  const phone = sanitizePiiInput(fields.phone);
  const email = sanitizePiiInput(fields.email);
  const address = sanitizePiiInput(fields.address);
  const notes = sanitizePiiInput(fields.notes);

  return {
    aliasEncrypted: await encryptPii(alias),
    firstNameEncrypted: await encryptPii(firstName),
    phoneEncrypted: await encryptPii(phone),
    emailEncrypted: await encryptPii(email),
    addressEncrypted: await encryptPii(address),
    notesEncrypted: await encryptPii(notes),
    aliasHash: await hashLookupValue(alias),
    phoneHash: await hashLookupValue(phone),
    emailHash: await hashLookupValue(email),
    piiEncryptionVersion: getPiiEncryptionVersion(),
  };
}

async function decryptEncryptedFirst(
  row: Record<string, unknown>,
  field: string,
  encrypted: unknown,
  plaintext: unknown,
): Promise<string | null> {
  const encryptedString = sanitizePiiInput(encrypted);
  if (encryptedString) {
    try {
      return await decryptPii(encryptedString);
    } catch (error) {
      reportVaultError();
      const vault = await getVaultRuntimeStatus();
      const message = error instanceof Error ? error.message : "unknown";
      const action = message.includes("Invalid encrypted payload")
        ? "privacy_vault_invalid_payload"
        : !vault.current_key_loaded || !vault.hash_key_loaded
          ? "privacy_vault_key_unavailable"
          : "privacy_vault_decrypt_failed";
      await logPrivacySecurityEvent({
        action,
        businessId: (row.businessId as string | undefined) || null,
        customerId: (row.id as string | undefined) || null,
        field,
        details: {
          current_key_loaded: vault.current_key_loaded,
          previous_key_loaded: vault.previous_key_loaded,
          hash_key_loaded: vault.hash_key_loaded,
          error: message,
        },
      });
      console.error("[privacy] Failed to decrypt customer field", error);
      return null;
    }
  }
  return sanitizePiiInput(plaintext);
}

export async function decodeCustomerPii(
  row: Record<string, unknown>,
): Promise<CustomerPiiFields> {
  return {
    alias: await decryptEncryptedFirst(
      row,
      "alias",
      row.aliasEncrypted,
      row.alias,
    ),
    first_name: await decryptEncryptedFirst(
      row,
      "first_name",
      row.firstNameEncrypted,
      row.firstName,
    ),
    phone: await decryptEncryptedFirst(
      row,
      "phone",
      row.phoneEncrypted,
      row.phoneNumber,
    ),
    email: await decryptEncryptedFirst(row, "email", row.emailEncrypted, row.email),
    address: await decryptEncryptedFirst(
      row,
      "address",
      row.addressEncrypted,
      row.address,
    ),
    notes: await decryptEncryptedFirst(row, "notes", row.notesEncrypted, row.notes),
  };
}
