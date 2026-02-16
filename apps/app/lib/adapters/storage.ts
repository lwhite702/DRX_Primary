/**
 * Storage Adapter
 *
 * Wraps @wrelik/storage for file operations.
 */

import {
  putObject,
  getSignedDownloadUrl,
  getSignedUploadUrl,
} from "@wrelik/storage";

/**
 * Upload a file to tenant-scoped storage
 */
export async function uploadFile(
  tenantId: string,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string = "application/octet-stream"
) {
  const tenantKey = `${tenantId}/${key}`;
  return putObject(body, tenantKey, contentType);
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
  return getSignedDownloadUrl(tenantKey, expiresIn);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(tenantId: string, key: string) {
  void tenantId;
  void key;
  return false;
}

export const storage = {
  upload: uploadFile,
  getPresignedUrl,
  delete: deleteFile,
};
