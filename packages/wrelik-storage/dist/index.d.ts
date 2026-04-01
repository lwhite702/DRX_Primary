import * as _aws_sdk_client_s3 from '@aws-sdk/client-s3';
export { v as validateUpload } from './shared-DqbBUqiW.js';

interface StorageConfig {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region?: string;
}
declare function initStorage(config: StorageConfig): void;
declare function putObject(body: Buffer | Uint8Array | Blob | string, key: string, contentType: string, metadata?: Record<string, string>): Promise<_aws_sdk_client_s3.PutObjectCommandOutput>;
declare function getSignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
declare function getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;

export { type StorageConfig, getSignedDownloadUrl, getSignedUploadUrl, initStorage, putObject };
