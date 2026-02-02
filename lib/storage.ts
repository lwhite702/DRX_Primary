import { S3Client } from "@aws-sdk/client-s3";

// Initialize R2 (S3-compatible) client
// Credentials should be in process.env:
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const storageClient =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || "drx-primary-bucket";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
) {
  if (!storageClient) throw new Error("Storage client not configured");
  // Implementation would use PutObjectCommand
  // const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: body });
  // return storageClient.send(command);
  console.warn("Mock upload: ", key);
}
