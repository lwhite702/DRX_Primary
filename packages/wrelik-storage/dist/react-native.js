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

// src/react-native.ts
var react_native_exports = {};
__export(react_native_exports, {
  downloadFromSignedUrl: () => downloadFromSignedUrl,
  uploadToSignedUrl: () => uploadToSignedUrl,
  validateUpload: () => validateUpload
});
module.exports = __toCommonJS(react_native_exports);

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

// src/react-native.ts
async function uploadToSignedUrl({
  url,
  file,
  contentType,
  headers = {}
}) {
  const result = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
      ...headers
    }
  });
  if (!result.ok) {
    throw new Error(`Upload failed with status ${result.status}`);
  }
  return true;
}
async function downloadFromSignedUrl({ url }) {
  const result = await fetch(url);
  if (!result.ok) {
    throw new Error(`Download failed with status ${result.status}`);
  }
  return result.blob();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  downloadFromSignedUrl,
  uploadToSignedUrl,
  validateUpload
});
