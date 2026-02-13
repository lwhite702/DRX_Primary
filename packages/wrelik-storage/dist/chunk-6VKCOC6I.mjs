// src/shared.ts
import { ValidationError } from "@wrelik/errors";
function validateUpload(file, policy) {
  if (file.sizeBytes > policy.maxSizeBytes) {
    throw new ValidationError(`File too large. Max ${policy.maxSizeBytes} bytes.`);
  }
  if (!policy.allowedTypes.includes(file.contentType)) {
    throw new ValidationError(`Invalid file type ${file.contentType}`);
  }
  return true;
}

export {
  validateUpload
};
