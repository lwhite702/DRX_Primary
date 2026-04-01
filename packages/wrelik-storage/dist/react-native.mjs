import {
  validateUpload
} from "./chunk-6VKCOC6I.mjs";

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
export {
  downloadFromSignedUrl,
  uploadToSignedUrl,
  validateUpload
};
