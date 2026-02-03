/**
 * Storage Adapter
 *
 * Wraps @wrelik/storage for file operations with R2
 */

import { storage } from "@wrelik/storage";

export { storage };

/**
 * Upload a file to tenant-scoped storage
 */
export async function uploadFile(
  tenantId: string,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
) {
  const tenantKey = `${tenantId}/${key}`;
  return storage.upload(tenantKey, body, { contentType });
}

/**
 * Get a presigned URL for a file
 */
export async function getPresignedUrl(
  tenantId: string,
  key: string,
  expiresIn: number = 3600
) {
  const tenantKey = `${tenantId}/${key}`;
  return storage.getPresignedUrl(tenantKey, { expiresIn });
}

/**
 * Delete a file from storage
 */
export async function deleteFile(tenantId: string, key: string) {
  const tenantKey = `${tenantId}/${key}`;
  return storage.delete(tenantKey);
}
