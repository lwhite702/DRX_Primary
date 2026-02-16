/**
 * Storage Client
 */

import { putObject, getSignedDownloadUrl } from "@wrelik/storage";

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "drx-primary-bucket";

export const storageClient = {
  async upload(key: string, body: Buffer | Uint8Array | string) {
    return putObject(body, key, "application/octet-stream");
  },
  async getPresignedUrl(key: string, options?: { expiresIn?: number }) {
    return getSignedDownloadUrl(key, options?.expiresIn ?? 3600);
  },
  async delete(_key: string) {
    return false;
  },
};

export async function uploadFile(key: string, body: Buffer | Uint8Array | string) {
  return storageClient.upload(key, body);
}

export async function getPresignedUrl(key: string, expiresIn: number = 3600) {
  return storageClient.getPresignedUrl(key, { expiresIn });
}

export async function deleteFile(key: string) {
  return storageClient.delete(key);
}
