import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ValidationError } from '@wrelik/errors';

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string;
}

let client: S3Client;
let bucket: string;

export function initStorage(config: StorageConfig) {
  // For R2, endpoint: https://<accountid>.r2.cloudflarestorage.com
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

  client = new S3Client({
    region: config.region || 'auto',
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  bucket = config.bucketName;
}

function getClient() {
  if (!client) throw new Error('Storage not initialized. Call initStorage first.');
  return client;
}

export async function putObject(
  body: Buffer | Uint8Array | Blob | string,
  key: string,
  contentType: string,
  metadata?: Record<string, string>,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  return getClient().send(command);
}

export async function getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(getClient(), command, { expiresIn });
}

export * from './shared';
