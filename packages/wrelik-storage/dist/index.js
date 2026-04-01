"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  getSignedDownloadUrl: () => getSignedDownloadUrl,
  getSignedUploadUrl: () => getSignedUploadUrl,
  initStorage: () => initStorage,
  putObject: () => putObject,
  validateUpload: () => validateUpload
});
module.exports = __toCommonJS(index_exports);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");

// src/shared.ts
var import_errors = require("@wrelik/errors");
function validateUpload(file, policy) {
  if (file.sizeBytes > policy.maxSizeBytes) {
    throw new import_errors.ValidationError(`File too large. Max ${policy.maxSizeBytes} bytes.`);
  }
  if (!policy.allowedTypes.includes(file.contentType)) {
    throw new import_errors.ValidationError(`Invalid file type ${file.contentType}`);
  }
  return true;
}

// src/index.ts
var client;
var bucket;
function initStorage(config) {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  client = new import_client_s3.S3Client({
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
  const command = new import_client_s3.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata
  });
  return getClient().send(command);
}
async function getSignedUploadUrl(key, contentType, expiresIn = 3600) {
  const command = new import_client_s3.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  return (0, import_s3_request_presigner.getSignedUrl)(getClient(), command, { expiresIn });
}
async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new import_client_s3.GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return (0, import_s3_request_presigner.getSignedUrl)(getClient(), command, { expiresIn });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSignedDownloadUrl,
  getSignedUploadUrl,
  initStorage,
  putObject,
  validateUpload
});
