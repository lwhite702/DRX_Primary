import {
  validateUpload
} from "./chunk-6VKCOC6I.mjs";

// src/index.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var client;
var bucket;
function initStorage(config) {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  client = new S3Client({
    region: config.region || "auto",
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  bucket = config.bucketName;
}
function getClient() {
  if (!client) throw new Error("Storage not initialized. Call initStorage first.");
  return client;
}
async function putObject(body, key, contentType, metadata) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata
  });
  return getClient().send(command);
}
async function getSignedUploadUrl(key, contentType, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}
async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}
export {
  getSignedDownloadUrl,
  getSignedUploadUrl,
  initStorage,
  putObject,
  validateUpload
};
