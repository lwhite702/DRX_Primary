/**
 * Storage Client
 *
 * This module provides file storage operations through @wrelik/storage
 */

import { storage } from "@wrelik/storage";

export const storageClient = storage;

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "drx-primary-bucket";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
) {
  return storage.upload(key, body);
}

export async function getPresignedUrl(key: string, expiresIn: number = 3600) {
  return storage.getPresignedUrl(key, { expiresIn });
}

export async function deleteFile(key: string) {
  return storage.delete(key);
}
